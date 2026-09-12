//! 自定义 Task View 的 SQLite 持久化。

use sea_orm::{
    sea_query::Expr, ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait,
    DatabaseConnection, EntityTrait, QueryFilter, QueryOrder,
};
use stoneflow_application::view::codec::NO_GROUP_JSON;
use stoneflow_domain::{ViewEntityKind, POSITION_STEP};

use crate::{
    entities::{common::ViewEntityKind as StorageViewEntityKind, prelude::View, view},
    error::StorageError,
    mappers::{view_entity_kind_to_domain, view_entity_kind_to_schema},
};

#[derive(Debug, Clone)]
pub struct CreateViewRecord {
    pub id: String,
    pub name: String,
    pub entity_kind: ViewEntityKind,
    pub scope_json: String,
    pub filters_json: String,
    pub sort_json: String,
    pub group_by_json: Option<String>,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateViewPatch {
    pub name: Option<String>,
    pub scope_json: Option<String>,
    pub filters_json: Option<String>,
    pub sort_json: Option<String>,
    pub group_by_json: Option<Option<String>>,
    pub position: Option<i64>,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct ViewRepository {
    db: DatabaseConnection,
}

impl ViewRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    pub async fn get(&self, view_id: &str) -> Result<Option<view::Model>, StorageError> {
        self.get_in_connection(&self.db, view_id).await
    }

    pub async fn get_in_connection<C: ConnectionTrait>(
        &self,
        connection: &C,
        view_id: &str,
    ) -> Result<Option<view::Model>, StorageError> {
        let mut record = View::find_by_id(view_id).one(connection).await?;
        if let Some(record) = record.as_mut() {
            if record.entity_kind == StorageViewEntityKind::Task
                && record.group_by_json.as_deref() == Some("none")
            {
                repair_legacy_group_by(connection, Some(view_id)).await?;
                record.group_by_json = Some(NO_GROUP_JSON.to_owned());
            }
        }
        Ok(record)
    }

    pub async fn list(&self) -> Result<Vec<view::Model>, StorageError> {
        let mut records = View::find()
            .filter(view::Column::EntityKind.eq(StorageViewEntityKind::Task))
            .order_by_asc(view::Column::Position)
            .order_by_asc(view::Column::CreatedAt)
            .all(&self.db)
            .await?;
        if records
            .iter()
            .any(|record| record.group_by_json.as_deref() == Some("none"))
        {
            repair_legacy_group_by(&self.db, None).await?;
            for record in &mut records {
                record.group_by_json = canonical_legacy_group_by(record.group_by_json.take());
            }
        }
        Ok(records)
    }

    pub async fn next_position<C>(&self, connection: &C) -> Result<i64, StorageError>
    where
        C: ConnectionTrait,
    {
        let last = View::find()
            .filter(view::Column::EntityKind.eq(StorageViewEntityKind::Task))
            .order_by_desc(view::Column::Position)
            .one(connection)
            .await?;
        Ok(last.map_or(POSITION_STEP, |view| view.position + POSITION_STEP))
    }

    pub async fn create<C>(
        &self,
        connection: &C,
        record: CreateViewRecord,
    ) -> Result<view::Model, StorageError>
    where
        C: ConnectionTrait,
    {
        view::ActiveModel {
            id: Set(record.id),
            name: Set(record.name),
            entity_kind: Set(view_entity_kind_to_schema(record.entity_kind)),
            scope_json: Set(record.scope_json),
            filters_json: Set(record.filters_json),
            sort_json: Set(record.sort_json),
            group_by_json: Set(canonical_legacy_group_by(record.group_by_json)),
            position: Set(record.position),
            generation: Set(1),
            created_at: Set(record.created_at),
            updated_at: Set(record.updated_at),
        }
        .insert(connection)
        .await
        .map_err(Into::into)
    }

    pub async fn update<C>(
        &self,
        connection: &C,
        view_id: &str,
        patch: UpdateViewPatch,
    ) -> Result<Option<view::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        repair_legacy_group_by(connection, Some(view_id)).await?;
        let Some(current) = View::find_by_id(view_id).one(connection).await? else {
            return Ok(None);
        };
        let mut model: view::ActiveModel = current.into();
        if let Some(value) = patch.name {
            model.name = Set(value);
        }
        if let Some(value) = patch.scope_json {
            model.scope_json = Set(value);
        }
        if let Some(value) = patch.filters_json {
            model.filters_json = Set(value);
        }
        if let Some(value) = patch.sort_json {
            model.sort_json = Set(value);
        }
        if let Some(value) = patch.group_by_json {
            model.group_by_json = Set(canonical_legacy_group_by(value));
        }
        if let Some(value) = patch.position {
            model.position = Set(value);
        }
        model.updated_at = Set(patch.updated_at);
        // generation 是实体代际；普通字段 patch 必须留在同代，才能合并远端并发编辑。
        model.update(connection).await.map(Some).map_err(Into::into)
    }

    pub async fn delete<C>(&self, connection: &C, view_id: &str) -> Result<u64, StorageError>
    where
        C: ConnectionTrait,
    {
        Ok(View::delete_by_id(view_id)
            .exec(connection)
            .await?
            .rows_affected)
    }
}

fn canonical_legacy_group_by(value: Option<String>) -> Option<String> {
    value.map(|value| {
        if value == "none" {
            NO_GROUP_JSON.to_owned()
        } else {
            value
        }
    })
}

/// 只修复已确认的裸 none 编码，不触碰查询、业务时间、代际或 Outbox。
async fn repair_legacy_group_by<C>(
    connection: &C,
    view_id: Option<&str>,
) -> Result<(), StorageError>
where
    C: ConnectionTrait,
{
    let mut update = View::update_many()
        .col_expr(view::Column::GroupByJson, Expr::value(NO_GROUP_JSON))
        .filter(view::Column::EntityKind.eq(StorageViewEntityKind::Task))
        .filter(view::Column::GroupByJson.eq("none"));
    if let Some(view_id) = view_id {
        update = update.filter(view::Column::Id.eq(view_id));
    }
    update.exec(connection).await?;
    Ok(())
}

pub fn map_view(model: view::Model) -> stoneflow_application::view::ViewRecord {
    stoneflow_application::view::ViewRecord {
        id: model.id,
        name: model.name,
        entity_kind: view_entity_kind_to_domain(model.entity_kind),
        scope_json: model.scope_json,
        filters_json: model.filters_json,
        sort_json: model.sort_json,
        group_by_json: model.group_by_json,
        position: model.position,
        generation: model.generation,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

#[cfg(test)]
mod tests {
    use stoneflow_test_support::TestDatabase;

    use super::*;
    use crate::repositories::OutboxRepository;

    fn fixture(id: &str, group_by_json: Option<&str>) -> view::ActiveModel {
        view::ActiveModel {
            id: Set(id.to_owned()),
            name: Set("待执行".to_owned()),
            entity_kind: Set(StorageViewEntityKind::Task),
            scope_json: Set(r#"{"type":"all"}"#.to_owned()),
            filters_json: Set(
                r#"{"baseViewKey":"active","context":{"kind":"all"},"filters":{"clauses":[]}}"#
                    .to_owned(),
            ),
            sort_json: Set("old-sort".to_owned()),
            group_by_json: Set(group_by_json.map(str::to_owned)),
            position: Set(1024),
            generation: Set(7),
            created_at: Set("2026-08-22T00:00:00Z".to_owned()),
            updated_at: Set("2026-08-23T00:00:00Z".to_owned()),
        }
    }

    #[tokio::test]
    async fn reads_repair_only_bare_none_without_business_changes_or_outbox() {
        let database = TestDatabase::bootstrap_in_memory().await.unwrap();
        let connection = database.connection();
        let repository = ViewRepository::new(connection.clone());
        let outbox = OutboxRepository::new(connection.clone());
        let mut expected = fixture("legacy-get", Some("none"))
            .insert(connection)
            .await
            .unwrap();
        fixture("legacy-list", Some("none"))
            .insert(connection)
            .await
            .unwrap();
        let unknown = fixture("unknown", Some("unknown"))
            .insert(connection)
            .await
            .unwrap();
        let canonical = fixture("canonical", Some(NO_GROUP_JSON))
            .insert(connection)
            .await
            .unwrap();
        let absent = fixture("absent", None).insert(connection).await.unwrap();
        let count_before = outbox.count_all().await.unwrap();
        expected.group_by_json = Some(NO_GROUP_JSON.to_owned());

        assert_eq!(
            repository.get("legacy-get").await.unwrap(),
            Some(expected.clone())
        );
        assert_eq!(
            repository.get("legacy-get").await.unwrap(),
            Some(expected.clone())
        );
        let first_list = repository.list().await.unwrap();
        assert_eq!(repository.list().await.unwrap(), first_list);
        assert_eq!(
            View::find_by_id("legacy-get")
                .one(connection)
                .await
                .unwrap(),
            Some(expected)
        );
        assert_eq!(
            View::find_by_id("legacy-list")
                .one(connection)
                .await
                .unwrap()
                .unwrap()
                .group_by_json
                .as_deref(),
            Some(NO_GROUP_JSON)
        );
        for unchanged in [unknown, canonical, absent] {
            assert_eq!(
                View::find_by_id(&unchanged.id)
                    .one(connection)
                    .await
                    .unwrap(),
                Some(unchanged)
            );
        }
        assert_eq!(outbox.count_all().await.unwrap(), count_before);
    }

    #[tokio::test]
    async fn writes_canonicalize_bare_none_and_keep_the_entity_generation() {
        let database = TestDatabase::bootstrap_in_memory().await.unwrap();
        let connection = database.connection();
        let repository = ViewRepository::new(connection.clone());
        let original = fixture("legacy", Some("none"))
            .insert(connection)
            .await
            .unwrap();
        let updated = repository
            .update(
                connection,
                &original.id,
                UpdateViewPatch {
                    name: Some("重命名".to_owned()),
                    group_by_json: Some(Some("none".to_owned())),
                    updated_at: "2026-08-24T00:00:00Z".to_owned(),
                    ..Default::default()
                },
            )
            .await
            .unwrap()
            .unwrap();
        assert_eq!(updated.group_by_json.as_deref(), Some(NO_GROUP_JSON));
        assert_eq!(updated.generation, original.generation);
        assert_eq!(updated.created_at, original.created_at);
        assert_eq!(updated.filters_json, original.filters_json);

        let created = repository
            .create(
                connection,
                CreateViewRecord {
                    id: "created".to_owned(),
                    name: original.name,
                    entity_kind: ViewEntityKind::Task,
                    scope_json: original.scope_json,
                    filters_json: original.filters_json,
                    sort_json: original.sort_json,
                    group_by_json: Some("none".to_owned()),
                    position: original.position,
                    created_at: original.created_at,
                    updated_at: original.updated_at,
                },
            )
            .await
            .unwrap();
        assert_eq!(created.group_by_json.as_deref(), Some(NO_GROUP_JSON));
    }
}
