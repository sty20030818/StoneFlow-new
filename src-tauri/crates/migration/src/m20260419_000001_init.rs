//! 首版 StoneFlow 数据底座 schema。

use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Spaces::Table)
                    .if_not_exists()
                    .col(uuid(Spaces::Id).primary_key())
                    .col(string(Spaces::Name))
                    .col(string_uniq(Spaces::Slug))
                    .col(integer(Spaces::SortOrder).default(0))
                    .col(boolean(Spaces::IsArchived).default(false))
                    .col(timestamp(Spaces::CreatedAt).default(Expr::current_timestamp()))
                    .col(timestamp(Spaces::UpdatedAt).default(Expr::current_timestamp()))
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Projects::Table)
                    .if_not_exists()
                    .col(uuid(Projects::Id).primary_key())
                    .col(uuid(Projects::SpaceId))
                    .col(uuid_null(Projects::ParentProjectId))
                    .col(string(Projects::Name))
                    .col(string(Projects::Status).default("active"))
                    .col(text_null(Projects::Note))
                    .col(timestamp_null(Projects::DueAt))
                    .col(integer(Projects::SortOrder).default(0))
                    .col(boolean(Projects::IsDeleted).default(false))
                    .col(timestamp(Projects::CreatedAt).default(Expr::current_timestamp()))
                    .col(timestamp(Projects::UpdatedAt).default(Expr::current_timestamp()))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-projects-space_id")
                            .from(Projects::Table, Projects::SpaceId)
                            .to(Spaces::Table, Spaces::Id)
                            .on_update(ForeignKeyAction::Cascade)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-projects-parent_project_id")
                            .from(Projects::Table, Projects::ParentProjectId)
                            .to(Projects::Table, Projects::Id)
                            .on_update(ForeignKeyAction::Cascade)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-projects-space_id")
                    .table(Projects::Table)
                    .col(Projects::SpaceId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-projects-parent_project_id")
                    .table(Projects::Table)
                    .col(Projects::ParentProjectId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Tasks::Table)
                    .if_not_exists()
                    .col(uuid(Tasks::Id).primary_key())
                    .col(uuid(Tasks::SpaceId))
                    .col(uuid_null(Tasks::ProjectId))
                    .col(string(Tasks::Title))
                    .col(string(Tasks::Status).default("todo"))
                    .col(string_null(Tasks::Priority))
                    .col(text_null(Tasks::Note))
                    .col(json_binary(Tasks::Tags).default("[]"))
                    .col(timestamp_null(Tasks::DueAt))
                    .col(boolean(Tasks::Pinned).default(false))
                    .col(string(Tasks::Source).default("manual"))
                    .col(timestamp_null(Tasks::DeletedAt))
                    .col(timestamp_null(Tasks::CompletedAt))
                    .col(timestamp(Tasks::CreatedAt).default(Expr::current_timestamp()))
                    .col(timestamp(Tasks::UpdatedAt).default(Expr::current_timestamp()))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-tasks-space_id")
                            .from(Tasks::Table, Tasks::SpaceId)
                            .to(Spaces::Table, Spaces::Id)
                            .on_update(ForeignKeyAction::Cascade)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-tasks-project_id")
                            .from(Tasks::Table, Tasks::ProjectId)
                            .to(Projects::Table, Projects::Id)
                            .on_update(ForeignKeyAction::Cascade)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-tasks-space_id")
                    .table(Tasks::Table)
                    .col(Tasks::SpaceId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-tasks-project_id")
                    .table(Tasks::Table)
                    .col(Tasks::ProjectId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(TrashEntries::Table)
                    .if_not_exists()
                    .col(uuid(TrashEntries::Id).primary_key())
                    .col(uuid(TrashEntries::SpaceId))
                    .col(string(TrashEntries::EntityType))
                    .col(uuid(TrashEntries::EntityId))
                    .col(json_binary(TrashEntries::EntitySnapshot).default("{}"))
                    .col(timestamp(TrashEntries::DeletedAt).default(Expr::current_timestamp()))
                    .col(string_null(TrashEntries::DeletedFrom))
                    .col(timestamp(TrashEntries::CreatedAt).default(Expr::current_timestamp()))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-trash_entries-space_id")
                            .from(TrashEntries::Table, TrashEntries::SpaceId)
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
                    .name("idx-trash_entries-space_id")
                    .table(TrashEntries::Table)
                    .col(TrashEntries::SpaceId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(TrashEntries::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Tasks::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Projects::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Spaces::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Spaces {
    Table,
    Id,
    Name,
    Slug,
    SortOrder,
    IsArchived,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Projects {
    Table,
    Id,
    SpaceId,
    ParentProjectId,
    Name,
    Status,
    Note,
    DueAt,
    SortOrder,
    IsDeleted,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Tasks {
    Table,
    Id,
    SpaceId,
    ProjectId,
    Title,
    Status,
    Priority,
    Note,
    Tags,
    DueAt,
    Pinned,
    Source,
    DeletedAt,
    CompletedAt,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum TrashEntries {
    Table,
    Id,
    SpaceId,
    EntityType,
    EntityId,
    EntitySnapshot,
    DeletedAt,
    DeletedFrom,
    CreatedAt,
}
