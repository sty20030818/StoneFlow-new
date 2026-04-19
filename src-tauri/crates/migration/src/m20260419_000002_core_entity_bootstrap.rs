//! M2-A 核心实体补齐与初始化底座收口。

use sea_orm::ConnectionTrait;
use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        if !manager.has_column("projects", "deleted_at").await? {
            manager
                .alter_table(
                    Table::alter()
                        .table(Projects::Table)
                        .add_column(timestamp_null(Projects::DeletedAt))
                        .to_owned(),
                )
                .await?;
        }

        manager
      .get_connection()
      .execute_unprepared(
        "UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE is_deleted = 1 AND deleted_at IS NULL",
      )
      .await?;

        manager
            .create_table(
                Table::create()
                    .table(Resources::Table)
                    .if_not_exists()
                    .col(uuid(Resources::Id).primary_key())
                    .col(uuid(Resources::TaskId))
                    .col(string(Resources::Type))
                    .col(string(Resources::Title))
                    .col(text(Resources::Target))
                    .col(json_binary(Resources::Metadata).default("{}"))
                    .col(integer(Resources::SortOrder).default(0))
                    .col(timestamp(Resources::CreatedAt).default(Expr::current_timestamp()))
                    .col(timestamp(Resources::UpdatedAt).default(Expr::current_timestamp()))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-resources-task_id")
                            .from(Resources::Table, Resources::TaskId)
                            .to(Tasks::Table, Tasks::Id)
                            .on_update(ForeignKeyAction::Cascade)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-projects-space_id-sort_order")
                    .table(Projects::Table)
                    .col(Projects::SpaceId)
                    .col(Projects::SortOrder)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-projects-deleted_at")
                    .table(Projects::Table)
                    .col(Projects::DeletedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-tasks-space_id-project_id-status")
                    .table(Tasks::Table)
                    .col(Tasks::SpaceId)
                    .col(Tasks::ProjectId)
                    .col(Tasks::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-tasks-space_id-created_at")
                    .table(Tasks::Table)
                    .col(Tasks::SpaceId)
                    .col(Tasks::CreatedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-tasks-space_id-deleted_at")
                    .table(Tasks::Table)
                    .col(Tasks::SpaceId)
                    .col(Tasks::DeletedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-resources-task_id-sort_order")
                    .table(Resources::Table)
                    .col(Resources::TaskId)
                    .col(Resources::SortOrder)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(FocusViews::Table)
                    .if_not_exists()
                    .col(uuid(FocusViews::Id).primary_key())
                    .col(uuid(FocusViews::SpaceId))
                    .col(string(FocusViews::Name))
                    .col(string(FocusViews::Key))
                    .col(string(FocusViews::Type).default("system"))
                    .col(json_binary(FocusViews::FilterConfig).default("{}"))
                    .col(json_binary(FocusViews::SortConfig).default("{}"))
                    .col(json_binary(FocusViews::GroupConfig).default("{}"))
                    .col(integer(FocusViews::SortOrder).default(0))
                    .col(boolean(FocusViews::IsEnabled).default(true))
                    .col(timestamp(FocusViews::CreatedAt).default(Expr::current_timestamp()))
                    .col(timestamp(FocusViews::UpdatedAt).default(Expr::current_timestamp()))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-focus_views-space_id")
                            .from(FocusViews::Table, FocusViews::SpaceId)
                            .to(Spaces::Table, Spaces::Id)
                            .on_update(ForeignKeyAction::Cascade)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-focus_views-space_id-sort_order")
                    .table(FocusViews::Table)
                    .col(FocusViews::SpaceId)
                    .col(FocusViews::SortOrder)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("uq-focus_views-space_id-key")
                    .table(FocusViews::Table)
                    .col(FocusViews::SpaceId)
                    .col(FocusViews::Key)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-trash_entries-space_id-deleted_at")
                    .table(TrashEntries::Table)
                    .col(TrashEntries::SpaceId)
                    .col(TrashEntries::DeletedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("uq-trash_entries-entity_type-entity_id")
                    .table(TrashEntries::Table)
                    .col(TrashEntries::EntityType)
                    .col(TrashEntries::EntityId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("uq-trash_entries-entity_type-entity_id")
                    .table(TrashEntries::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx-trash_entries-space_id-deleted_at")
                    .table(TrashEntries::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("uq-focus_views-space_id-key")
                    .table(FocusViews::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx-focus_views-space_id-sort_order")
                    .table(FocusViews::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(FocusViews::Table).to_owned())
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx-resources-task_id-sort_order")
                    .table(Resources::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(Resources::Table).to_owned())
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx-tasks-space_id-deleted_at")
                    .table(Tasks::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx-tasks-space_id-created_at")
                    .table(Tasks::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx-tasks-space_id-project_id-status")
                    .table(Tasks::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx-projects-deleted_at")
                    .table(Projects::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx-projects-space_id-sort_order")
                    .table(Projects::Table)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Spaces {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Projects {
    Table,
    SpaceId,
    SortOrder,
    DeletedAt,
}

#[derive(DeriveIden)]
enum Tasks {
    Table,
    Id,
    SpaceId,
    ProjectId,
    Status,
    DeletedAt,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Resources {
    Table,
    Id,
    TaskId,
    Type,
    Title,
    Target,
    Metadata,
    SortOrder,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum FocusViews {
    Table,
    Id,
    SpaceId,
    Name,
    Key,
    Type,
    FilterConfig,
    SortConfig,
    GroupConfig,
    SortOrder,
    IsEnabled,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum TrashEntries {
    Table,
    SpaceId,
    EntityType,
    EntityId,
    DeletedAt,
}
