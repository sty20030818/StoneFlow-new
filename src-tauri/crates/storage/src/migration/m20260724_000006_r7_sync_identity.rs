//! R7：将设备身份收口为本地单例。

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
                CREATE TABLE sync_devices_next (
                    singleton INTEGER PRIMARY KEY NOT NULL CHECK (singleton = 1),
                    device_id TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                INSERT INTO sync_devices_next(singleton, device_id, created_at, updated_at)
                SELECT 1, device_id, created_at, updated_at
                FROM sync_devices
                ORDER BY created_at ASC, device_id ASC
                LIMIT 1;

                DROP TABLE sync_devices;
                ALTER TABLE sync_devices_next RENAME TO sync_devices;
                "#,
            )
            .await
            .map(|_| ())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Ok(())
    }
}
