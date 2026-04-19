//! 数据底座初始化阶段使用的最小仓储入口。

use anyhow::{Context, Result};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait, JsonValue,
    QueryFilter, QueryOrder,
};
use stoneflow_core::{DefaultSpaceSeed, FocusViewType, SystemFocusViewDefinition};
use stoneflow_entity::{focus_view, project, space, task};
use uuid::Uuid;

/// 初始化阶段使用的 Space 仓储。
pub(crate) struct SpaceRepository<'db> {
    connection: &'db DatabaseConnection,
}

impl<'db> SpaceRepository<'db> {
    /// 创建仓储实例。
    pub(crate) const fn new(connection: &'db DatabaseConnection) -> Self {
        Self { connection }
    }

    /// 按 slug 查询空间。
    pub(crate) async fn find_by_slug(&self, slug: &str) -> Result<Option<space::Model>> {
        space::Entity::find()
            .filter(space::Column::Slug.eq(slug))
            .one(self.connection)
            .await
            .with_context(|| format!("failed to query space by slug `{slug}`"))
    }

    /// 保证默认空间存在，并在必要时回写规范字段。
    pub(crate) async fn ensure_space(&self, seed: &DefaultSpaceSeed) -> Result<space::Model> {
        if let Some(existing) = self.find_by_slug(seed.slug).await? {
            let needs_update = existing.name != seed.name
                || existing.sort_order != seed.sort_order
                || existing.is_archived;

            if !needs_update {
                return Ok(existing);
            }

            let mut active_model: space::ActiveModel = existing.into();
            let now = chrono::Utc::now();
            active_model.name = Set(seed.name.to_owned());
            active_model.sort_order = Set(seed.sort_order);
            active_model.is_archived = Set(false);
            active_model.updated_at = Set(now);

            return active_model
                .update(self.connection)
                .await
                .context("failed to update default space seed");
        }

        let now = chrono::Utc::now();

        space::ActiveModel {
            id: Set(Uuid::new_v4()),
            name: Set(seed.name.to_owned()),
            slug: Set(seed.slug.to_owned()),
            sort_order: Set(seed.sort_order),
            is_archived: Set(false),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(self.connection)
        .await
        .context("failed to insert default space seed")
    }

    /// 计算新的 Space 排序值。
    pub(crate) async fn next_sort_order(&self) -> Result<i32> {
        let next_sort_order = space::Entity::find()
            .order_by_desc(space::Column::SortOrder)
            .one(self.connection)
            .await
            .context("failed to query next space sort order")?
            .map_or(0, |space| space.sort_order.saturating_add(1));

        Ok(next_sort_order)
    }

    /// 创建新的 Space。
    pub(crate) async fn create_space(
        &self,
        name: &str,
        slug: &str,
        sort_order: i32,
    ) -> Result<space::Model> {
        let now = chrono::Utc::now();

        space::ActiveModel {
            id: Set(Uuid::new_v4()),
            name: Set(name.to_owned()),
            slug: Set(slug.to_owned()),
            sort_order: Set(sort_order),
            is_archived: Set(false),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(self.connection)
        .await
        .with_context(|| format!("failed to create space `{slug}`"))
    }
}

/// 初始化阶段使用的 FocusView 仓储。
pub(crate) struct FocusViewRepository<'db> {
    connection: &'db DatabaseConnection,
}

impl<'db> FocusViewRepository<'db> {
    /// 创建仓储实例。
    pub(crate) const fn new(connection: &'db DatabaseConnection) -> Self {
        Self { connection }
    }

    /// 按 space + key 查询视图。
    pub(crate) async fn find_by_space_and_key(
        &self,
        space_id: Uuid,
        key: &str,
    ) -> Result<Option<focus_view::Model>> {
        focus_view::Entity::find()
            .filter(focus_view::Column::SpaceId.eq(space_id))
            .filter(focus_view::Column::Key.eq(key))
            .one(self.connection)
            .await
            .with_context(|| format!("failed to query focus view `{key}` for space `{space_id}`"))
    }

    /// 保证系统默认视图存在，并在必要时回写规范字段。
    pub(crate) async fn upsert_system_view(
        &self,
        space_id: Uuid,
        definition: &SystemFocusViewDefinition,
    ) -> Result<focus_view::Model> {
        let key = definition.key.as_str();

        if let Some(existing) = self.find_by_space_and_key(space_id, key).await? {
            let needs_update = existing.name != definition.name
                || existing.r#type != FocusViewType::System.as_str()
                || existing.filter_config != definition.filter_config
                || existing.sort_config != definition.sort_config
                || existing.group_config != definition.group_config
                || existing.sort_order != definition.sort_order
                || !existing.is_enabled;

            if !needs_update {
                return Ok(existing);
            }

            let mut active_model: focus_view::ActiveModel = existing.into();
            active_model.name = Set(definition.name.to_owned());
            active_model.r#type = Set(FocusViewType::System.as_str().to_owned());
            active_model.filter_config = Set(definition.filter_config.clone());
            active_model.sort_config = Set(definition.sort_config.clone());
            active_model.group_config = Set(definition.group_config.clone());
            active_model.sort_order = Set(definition.sort_order);
            active_model.is_enabled = Set(true);
            active_model.updated_at = Set(chrono::Utc::now());

            return active_model
                .update(self.connection)
                .await
                .with_context(|| format!("failed to update system focus view `{key}`"));
        }

        let now = chrono::Utc::now();

        focus_view::ActiveModel {
            id: Set(Uuid::new_v4()),
            space_id: Set(space_id),
            name: Set(definition.name.to_owned()),
            key: Set(key.to_owned()),
            r#type: Set(FocusViewType::System.as_str().to_owned()),
            filter_config: Set(definition.filter_config.clone()),
            sort_config: Set(definition.sort_config.clone()),
            group_config: Set(definition.group_config.clone()),
            sort_order: Set(definition.sort_order),
            is_enabled: Set(true),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(self.connection)
        .await
        .with_context(|| format!("failed to insert system focus view `{key}`"))
    }
}

/// 创建阶段使用的 Project 仓储。
pub(crate) struct ProjectRepository<'db> {
    connection: &'db DatabaseConnection,
}

impl<'db> ProjectRepository<'db> {
    /// 创建仓储实例。
    pub(crate) const fn new(connection: &'db DatabaseConnection) -> Self {
        Self { connection }
    }

    /// 查询未删除的 Project。
    pub(crate) async fn find_active_by_id(&self, id: Uuid) -> Result<Option<project::Model>> {
        project::Entity::find()
            .filter(project::Column::Id.eq(id))
            .filter(project::Column::DeletedAt.is_null())
            .one(self.connection)
            .await
            .with_context(|| format!("failed to query project `{id}`"))
    }

    /// 计算 Space 下一个 Project 排序值。
    pub(crate) async fn next_sort_order(&self, space_id: Uuid) -> Result<i32> {
        let next_sort_order = project::Entity::find()
            .filter(project::Column::SpaceId.eq(space_id))
            .filter(project::Column::DeletedAt.is_null())
            .order_by_desc(project::Column::SortOrder)
            .one(self.connection)
            .await
            .with_context(|| format!("failed to query next project sort order for `{space_id}`"))?
            .map_or(0, |project| project.sort_order.saturating_add(1));

        Ok(next_sort_order)
    }

    /// 创建顶层 Project。
    pub(crate) async fn create_project(
        &self,
        space_id: Uuid,
        name: &str,
        status: &str,
        sort_order: i32,
    ) -> Result<project::Model> {
        let now = chrono::Utc::now();

        project::ActiveModel {
            id: Set(Uuid::new_v4()),
            space_id: Set(space_id),
            parent_project_id: Set(None),
            name: Set(name.to_owned()),
            status: Set(status.to_owned()),
            note: Set(None),
            due_at: Set(None),
            sort_order: Set(sort_order),
            deleted_at: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(self.connection)
        .await
        .with_context(|| format!("failed to create project `{name}`"))
    }
}

/// 创建阶段使用的 Task 仓储。
pub(crate) struct TaskRepository<'db> {
    connection: &'db DatabaseConnection,
}

impl<'db> TaskRepository<'db> {
    /// 创建仓储实例。
    pub(crate) const fn new(connection: &'db DatabaseConnection) -> Self {
        Self { connection }
    }

    /// 创建新的 Task。
    pub(crate) async fn create_task(
        &self,
        space_id: Uuid,
        project_id: Option<Uuid>,
        title: &str,
        note: Option<&str>,
        status: &str,
        source: &str,
    ) -> Result<task::Model> {
        let now = chrono::Utc::now();

        task::ActiveModel {
            id: Set(Uuid::new_v4()),
            space_id: Set(space_id),
            project_id: Set(project_id),
            title: Set(title.to_owned()),
            status: Set(status.to_owned()),
            priority: Set(None),
            note: Set(note.map(str::to_owned)),
            tags: Set(JsonValue::Array(Vec::new())),
            due_at: Set(None),
            pinned: Set(false),
            source: Set(source.to_owned()),
            deleted_at: Set(None),
            completed_at: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
        }
        .insert(self.connection)
        .await
        .with_context(|| format!("failed to create task `{title}`"))
    }
}
