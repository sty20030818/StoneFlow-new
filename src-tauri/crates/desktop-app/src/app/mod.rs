use anyhow::{Context, Result};
use sea_orm::{
  ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectOptions, Database, DatabaseConnection,
  EntityTrait, PaginatorTrait, QueryFilter,
};
use serde::Serialize;
use stoneflow_entity::{space, task};
use stoneflow_migration::{Migrator, MigratorTrait};
use tauri::{Manager, State, WebviewUrl, WebviewWindowBuilder};
#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;

const MAIN_WINDOW_LABEL: &str = "main";
const APP_DATA_SUBDIR: &str = "stoneflow";
const APP_DB_NAME: &str = "app.db";

#[derive(Debug)]
struct DatabaseState {
  connection: DatabaseConnection,
  database_path: String,
  is_ready: bool,
}

impl DatabaseState {
  fn payload(&self) -> HealthcheckPayload {
    let _connection = &self.connection;

    HealthcheckPayload {
      status: if self.is_ready { "ok" } else { "degraded" },
      app: "desktop-app",
      database_path: self.database_path.clone(),
      database_ready: self.is_ready,
    }
  }
}

#[derive(Debug, Clone, Serialize)]
struct HealthcheckPayload {
  status: &'static str,
  app: &'static str,
  database_path: String,
  database_ready: bool,
}

fn build_main_window(app: &tauri::App) -> tauri::Result<()> {
  if app.get_webview_window(MAIN_WINDOW_LABEL).is_some() {
    return Ok(());
  }

  let window_builder = WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, WebviewUrl::default())
    .title("StoneFlow")
    .inner_size(1440.0, 920.0)
    .min_inner_size(960.0, 720.0)
    .resizable(true)
    .fullscreen(false);

  #[cfg(target_os = "macos")]
  let window_builder = window_builder
    .decorations(true)
    .title_bar_style(TitleBarStyle::Overlay)
    .hidden_title(true);

  #[cfg(not(target_os = "macos"))]
  let window_builder = window_builder.decorations(false);

  window_builder.build()?;

  Ok(())
}

fn resolve_database_path(app: &tauri::App) -> Result<std::path::PathBuf> {
  let base_dir = app
    .path()
    .app_data_dir()
    .context("failed to resolve tauri app data dir")?;

  Ok(base_dir.join(APP_DATA_SUBDIR).join(APP_DB_NAME))
}

async fn connect_database(database_path: &std::path::Path) -> Result<DatabaseConnection> {
  let sqlite_path = database_path.to_path_buf();
  let mut options = ConnectOptions::new("sqlite://stoneflow.db");
  options.sqlx_logging(false);
  options.map_sqlx_sqlite_opts(move |sqlite_options| {
    sqlite_options.filename(&sqlite_path).create_if_missing(true)
  });

  Database::connect(options)
    .await
    .with_context(|| format!("failed to connect sqlite database at {}", database_path.display()))
}

async fn run_seed(connection: &DatabaseConnection) -> Result<()> {
  let default_space_slug = "default";
  let now = chrono::Utc::now();

  let existing_space = space::Entity::find()
    .filter(space::Column::Slug.eq(default_space_slug))
    .one(connection)
    .await
    .context("failed to query default space seed state")?;

  if existing_space.is_none() {
    let default_space_id = uuid::Uuid::new_v4();

    space::ActiveModel {
      id: Set(default_space_id),
      name: Set("工作".to_owned()),
      slug: Set(default_space_slug.to_owned()),
      sort_order: Set(0),
      is_archived: Set(false),
      created_at: Set(now),
      updated_at: Set(now),
    }
    .insert(connection)
    .await
    .context("failed to seed default space")?;
  }

  let _ = task::Entity::find()
    .filter(task::Column::SpaceId.is_not_null())
    .count(connection)
    .await
    .context("failed to verify task table availability after seed")?;

  Ok(())
}

async fn initialize_database(app: &tauri::App) -> Result<DatabaseState> {
  let database_path = resolve_database_path(app)?;
  prepare_database_at_path(&database_path).await
}

async fn prepare_database_at_path(database_path: &std::path::Path) -> Result<DatabaseState> {
  let database_dir = database_path
    .parent()
    .context("database path has no parent directory")?;

  std::fs::create_dir_all(database_dir).with_context(|| {
    format!(
      "failed to create database directory {}",
      database_dir.display()
    )
  })?;

  let connection = connect_database(&database_path).await?;

  Migrator::up(&connection, None)
    .await
    .with_context(|| format!("failed to run migrations for {}", database_path.display()))?;

  run_seed(&connection).await?;

  Ok(DatabaseState {
    connection,
    database_path: database_path.display().to_string(),
    is_ready: true,
  })
}

#[tauri::command]
fn healthcheck(database: State<'_, DatabaseState>) -> HealthcheckPayload {
  database.payload()
}

/// 启动 StoneFlow 的 Tauri 宿主。
pub fn builder() -> tauri::Builder<tauri::Wry> {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let database_state = tauri::async_runtime::block_on(initialize_database(app))
        .map_err(tauri::Error::Anyhow)?;

      app.manage(database_state);

      build_main_window(app)?;

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![healthcheck])
}

#[cfg(test)]
mod tests {
  use super::*;

  struct TestDatabaseDir {
    root: std::path::PathBuf,
  }

  impl TestDatabaseDir {
    fn new() -> Self {
      let root = std::env::temp_dir().join(format!(
        "stoneflow-db-test-{}",
        uuid::Uuid::new_v4()
      ));

      Self { root }
    }

    fn database_path(&self) -> std::path::PathBuf {
      self.root.join(APP_DB_NAME)
    }
  }

  impl Drop for TestDatabaseDir {
    fn drop(&mut self) {
      let _ = std::fs::remove_dir_all(&self.root);
    }
  }

  #[test]
  fn empty_database_bootstrap_creates_default_space() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
      let state = prepare_database_at_path(&temp_dir.database_path())
        .await
        .expect("empty database bootstrap should succeed");

      let count = space::Entity::find()
        .filter(space::Column::Slug.eq("default"))
        .count(&state.connection)
        .await
        .expect("default space count should be queryable");

      assert!(state.is_ready);
      assert_eq!(count, 1);
    });
  }

  #[test]
  fn repeated_bootstrap_keeps_seed_idempotent() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
      prepare_database_at_path(&temp_dir.database_path())
        .await
        .expect("first bootstrap should succeed");

      let state = prepare_database_at_path(&temp_dir.database_path())
        .await
        .expect("second bootstrap should succeed");

      let count = space::Entity::find()
        .filter(space::Column::Slug.eq("default"))
        .count(&state.connection)
        .await
        .expect("default space count should remain queryable");

      assert_eq!(count, 1);
    });
  }

  #[test]
  fn rerunning_migrator_on_existing_schema_is_safe() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
      let state = prepare_database_at_path(&temp_dir.database_path())
        .await
        .expect("bootstrap should succeed before rerunning migrator");

      Migrator::up(&state.connection, None)
        .await
        .expect("rerunning migrator on existing schema should succeed");
    });
  }
}
