//! R7 本地协议副本状态。

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                CREATE TABLE sync_protocol_entities (
                    entity_type TEXT NOT NULL CHECK (entity_type IN ('space', 'project', 'task', 'task_link', 'view')),
                    entity_id TEXT NOT NULL,
                    generation INTEGER NOT NULL CHECK (generation >= 1),
                    snapshot_json TEXT NULL,
                    tombstone_json TEXT NULL,
                    PRIMARY KEY (entity_type, entity_id),
                    CHECK ((snapshot_json IS NULL) <> (tombstone_json IS NULL))
                );
                "#,
            )
            .await
            .map(|_| ())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Ok(())
    }
}
