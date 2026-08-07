//! Task 命令：薄 transport — 解析 owned DTO、调 AppState 服务、映射错误。

use serde::Serialize;
use tauri::{Emitter, State};

use crate::app::error::AppError;
use crate::app::state::AppState;
use crate::sync;
use stoneflow_application::task::{
    BulkUpdateTasksDto, BulkUpdateTasksInput, CreateTaskInput, ListTasksInput, ListTasksPageDto,
    TaskDetailDto, TaskIdInput, UpdateTaskInput,
};
use stoneflow_application::task_link::{
    CreateTaskLinkInput, DeleteTaskLinkInput, ListTaskLinksInput, TaskLinkDto, UpdateTaskLinkInput,
};

const TASKS_CHANGED_EVENT: &str = "stoneflow://tasks/changed";

#[derive(Debug, Clone, Serialize)]
struct TaskChangedPayload {
    space_id: String,
    space_slug: String,
    task_id: String,
    source: String,
    space_fallback: bool,
}

#[tauri::command]
pub async fn list_tasks(
    input: ListTasksInput,
    state: State<'_, AppState>,
) -> Result<ListTasksPageDto, AppError> {
    state.tasks.list_tasks(input).await.map_err(AppError::from)
}

#[tauri::command]
pub async fn get_task_detail(
    input: TaskIdInput,
    state: State<'_, AppState>,
) -> Result<TaskDetailDto, AppError> {
    state
        .tasks
        .get_task_detail(input)
        .await
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn create_task(
    input: CreateTaskInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = state
        .tasks
        .create_task(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn update_task(
    input: UpdateTaskInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = state
        .tasks
        .update_task(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn bulk_update_tasks(
    input: BulkUpdateTasksInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<BulkUpdateTasksDto, AppError> {
    let result = state
        .tasks
        .bulk_update_tasks(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    for task_id in &result.task_ids {
        emit_task_changed_for_task_id(&app_handle, &state, task_id).await?;
    }
    Ok(result)
}

#[tauri::command]
pub async fn archive_task(
    input: TaskIdInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = state
        .tasks
        .archive_task(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn restore_task(
    input: TaskIdInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = state
        .tasks
        .restore_task(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn list_task_links(
    input: ListTaskLinksInput,
    state: State<'_, AppState>,
) -> Result<Vec<TaskLinkDto>, AppError> {
    state
        .task_links
        .list_task_links(input)
        .await
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn create_task_link(
    input: CreateTaskLinkInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<TaskLinkDto, AppError> {
    let link = state
        .task_links
        .create_task_link(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed_for_task_id(&app_handle, &state, &link.task_id).await?;
    Ok(link)
}

#[tauri::command]
pub async fn update_task_link(
    input: UpdateTaskLinkInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<TaskLinkDto, AppError> {
    let link = state
        .task_links
        .update_task_link(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed_for_task_id(&app_handle, &state, &link.task_id).await?;
    Ok(link)
}

#[tauri::command]
pub async fn delete_task_link(
    input: DeleteTaskLinkInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<TaskLinkDto, AppError> {
    let link = state
        .task_links
        .delete_task_link(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed_for_task_id(&app_handle, &state, &link.task_id).await?;
    Ok(link)
}

#[tauri::command]
pub async fn delete_task(
    input: TaskIdInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = state
        .tasks
        .delete_task(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn permanently_delete_task(
    input: TaskIdInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .tasks
        .permanently_delete_task(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    Ok(())
}

fn emit_task_changed(
    app_handle: &tauri::AppHandle,
    detail: &TaskDetailDto,
) -> Result<(), AppError> {
    app_handle
        .emit(
            TASKS_CHANGED_EVENT,
            TaskChangedPayload {
                space_id: detail.space_id.clone(),
                space_slug: detail.space_slug.clone(),
                task_id: detail.id.clone(),
                source: "app".to_owned(),
                space_fallback: false,
            },
        )
        .map_err(|error| AppError::internal(error.to_string()))
}

async fn emit_task_changed_for_task_id(
    app_handle: &tauri::AppHandle,
    state: &AppState,
    task_id: &str,
) -> Result<(), AppError> {
    let detail = state
        .tasks
        .get_task_detail(TaskIdInput {
            task_id: task_id.to_owned(),
        })
        .await
        .map_err(AppError::from)?;
    emit_task_changed(app_handle, &detail)
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter};
    use stoneflow_application::task::BulkTaskAction;
    use stoneflow_domain::{create_id, WorkStatus};
    use stoneflow_storage::{
        entities::{activity_event, outbox, task_link},
        repositories::{OutboxRepository, SpaceRepository},
    };
    use stoneflow_test_support::TestDatabase;

    use stoneflow_application::project::CreateProjectInput;
    use stoneflow_application::space::CreateSpaceInput;
    use stoneflow_application::task::{
        BulkUpdateTasksInput, CreateTaskInput, CreateTaskPlacementInput, ListTasksInput,
        ListTasksPlacementInput, ListTasksPlacementKind, TaskDetailDto, TaskIdInput,
        TaskScopeInput, TaskScopeKind, TaskWritePlacementKind, UpdateTaskInput,
        UpdateTaskPlacementInput,
    };
    use stoneflow_application::task_link::CreateTaskLinkInput;
    use stoneflow_storage::{
        build_project_service, build_space_service, build_task_link_service, build_task_service,
    };

    use crate::app::error::AppError;

    #[tokio::test]
    async fn bulk_update_tasks_should_leave_no_writes_when_prevalidation_fails() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let service = build_task_service(database.connection().clone());
        let task = create_task(&database, "保留原值").await;
        let outbox_count_before = OutboxRepository::new(database.connection().clone())
            .count_all()
            .await
            .expect("outbox count should succeed");
        let activity_count_before = activity_event::Entity::find()
            .count(database.connection())
            .await
            .expect("activity count should succeed");

        let error = AppError::from(
            service
                .bulk_update_tasks(BulkUpdateTasksInput {
                    task_ids: vec![task.id.clone(), create_id().to_string()],
                    action: BulkTaskAction::SetPriority { priority: 4 },
                })
                .await
                .expect_err("a missing task should reject the entire bulk operation"),
        );

        assert!(matches!(error, AppError::NotFound(_)));
        assert_eq!(
            service
                .get_task_detail(TaskIdInput { task_id: task.id })
                .await
                .expect("existing task should remain readable")
                .priority,
            0
        );
        assert_eq!(
            OutboxRepository::new(database.connection().clone())
                .count_all()
                .await
                .expect("outbox count should succeed"),
            outbox_count_before
        );
        assert_eq!(
            activity_event::Entity::find()
                .count(database.connection())
                .await
                .expect("activity count should succeed"),
            activity_count_before
        );
    }

    #[tokio::test]
    async fn bulk_update_tasks_should_share_one_operation_id_across_outbox_and_activity() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let task_a = create_task(&database, "任务 A").await;
        let task_b = create_task(&database, "任务 B").await;
        let service = build_task_service(database.connection().clone());

        let result = service
            .bulk_update_tasks(BulkUpdateTasksInput {
                task_ids: vec![task_a.id.clone(), task_b.id.clone()],
                action: BulkTaskAction::SetStatus {
                    status: WorkStatus::Doing,
                },
            })
            .await
            .expect("bulk update should succeed");

        let expected_task_ids = HashSet::from([task_a.id.clone(), task_b.id.clone()]);
        let outbox_rows = outbox::Entity::find()
            .filter(outbox::Column::OperationId.eq(&result.operation_id))
            .all(database.connection())
            .await
            .expect("outbox rows should be readable");
        assert_eq!(
            outbox_rows
                .iter()
                .map(|row| row.entity_id.clone())
                .collect::<HashSet<_>>(),
            expected_task_ids
        );
        let activity_rows = activity_event::Entity::find()
            .filter(activity_event::Column::OperationId.eq(&result.operation_id))
            .all(database.connection())
            .await
            .expect("activity rows should be readable");
        assert_eq!(
            activity_rows
                .iter()
                .map(|row| row.entity_id.clone())
                .collect::<HashSet<_>>(),
            expected_task_ids
        );
    }

    #[tokio::test]
    async fn bulk_task_lifecycle_should_commit_every_selected_task() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let archive_a = create_task(&database, "归档 A").await;
        let archive_b = create_task(&database, "归档 B").await;
        let delete_a = create_task(&database, "删除 A").await;
        let delete_b = create_task(&database, "删除 B").await;
        let service = build_task_service(database.connection().clone());

        let archive = service
            .bulk_update_tasks(BulkUpdateTasksInput {
                task_ids: vec![archive_a.id.clone(), archive_b.id.clone()],
                action: BulkTaskAction::Archive,
            })
            .await
            .expect("bulk archive should succeed");
        let delete = service
            .bulk_update_tasks(BulkUpdateTasksInput {
                task_ids: vec![delete_a.id.clone(), delete_b.id.clone()],
                action: BulkTaskAction::Delete,
            })
            .await
            .expect("bulk delete should succeed");

        assert_lifecycle_operation(
            &database,
            &archive.operation_id,
            &[&archive_a.id, &archive_b.id],
        )
        .await;
        assert_lifecycle_operation(
            &database,
            &delete.operation_id,
            &[&delete_a.id, &delete_b.id],
        )
        .await;
        assert!(service
            .get_task_detail(TaskIdInput {
                task_id: archive_a.id,
            })
            .await
            .expect("archived task should remain readable")
            .archived_at
            .is_some());
        assert!(service
            .get_task_detail(TaskIdInput {
                task_id: delete_a.id,
            })
            .await
            .expect("deleted task should remain readable")
            .deleted_at
            .is_some());
    }

    #[tokio::test]
    async fn moving_task_to_an_empty_container_should_assign_its_first_position() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let task = create_task(&database, "待移动任务").await;
        let space = SpaceRepository::new(database.connection().clone())
            .list_visible()
            .await
            .expect("default space should be present")
            .into_iter()
            .next()
            .expect("a visible default space should exist");
        let project = build_project_service(database.connection().clone())
            .create_project(CreateProjectInput {
                space_id: space.id.clone(),
                name: "空项目".to_owned(),
                description: None,
                status: None,
                priority: None,
                planned_at: None,
                due_at: None,
                remind_at: None,
            })
            .await
            .expect("project should create");

        let moved = build_task_service(database.connection().clone())
            .update_task(UpdateTaskInput {
                task_id: task.id,
                title: None,
                note: None,
                status: None,
                priority: None,
                placement: Some(UpdateTaskPlacementInput {
                    kind: TaskWritePlacementKind::Project,
                    space_id: space.id,
                    project_id: Some(project.id),
                }),
                due_at: None,
                planned_at: None,
                remind_at: None,
                position: None,
            })
            .await
            .expect("moving task should succeed");

        assert_eq!(moved.position, 1000);
    }

    #[tokio::test]
    async fn explicit_task_position_should_allow_adjacent_reorder_without_activity() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let first = create_task(&database, "第一个").await;
        let second = create_task(&database, "第二个").await;
        let third = create_task(&database, "第三个").await;
        let activity_count_before = activity_event::Entity::find()
            .count(database.connection())
            .await
            .expect("activity count should succeed");

        let reordered = build_task_service(database.connection().clone())
            .update_task(UpdateTaskInput {
                task_id: third.id,
                title: None,
                note: None,
                status: None,
                priority: None,
                placement: None,
                due_at: None,
                planned_at: None,
                remind_at: None,
                position: Some(1500),
            })
            .await
            .expect("position patch should succeed");

        assert_eq!(first.position, 1000);
        assert_eq!(second.position, 2000);
        assert_eq!(reordered.position, 1500);
        assert_eq!(
            activity_event::Entity::find()
                .count(database.connection())
                .await
                .expect("activity count should succeed"),
            activity_count_before
        );
    }

    #[tokio::test]
    async fn task_time_should_support_set_and_clear() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let task = create_task(&database, "时间任务").await;
        let service = build_task_service(database.connection().clone());

        let with_due_at = service
            .update_task(task_update(task.id.clone(), |input| {
                input.due_at = Some(Some("2026-07-23T09:00:00Z".to_owned()));
            }))
            .await
            .expect("setting dueAt should succeed");
        let cleared = service
            .update_task(task_update(with_due_at.id, |input| {
                input.due_at = Some(None);
            }))
            .await
            .expect("clearing dueAt should succeed");

        assert_eq!(
            with_due_at.due_at.as_deref(),
            Some("2026-07-23T09:00:00+00:00")
        );
        assert!(cleared.due_at.is_none());
    }

    #[tokio::test]
    async fn task_updates_should_preserve_work_state_and_priority_contracts() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let task = create_task(&database, "初始标题").await;
        let service = build_task_service(database.connection().clone());

        let renamed = service
            .update_task(task_update(task.id, |input| {
                input.title = Some("更新标题".to_owned());
                input.note = Some(Some("更新描述".to_owned()));
            }))
            .await
            .expect("title and note update should succeed");
        assert_eq!(renamed.title, "更新标题");
        assert_eq!(renamed.note.as_deref(), Some("更新描述"));

        let mut current = renamed;
        for status in [
            WorkStatus::Doing,
            WorkStatus::Waiting,
            WorkStatus::Done,
            WorkStatus::Canceled,
            WorkStatus::Todo,
        ] {
            current = service
                .update_task(task_update(current.id, |input| input.status = Some(status)))
                .await
                .expect("manual status transition should succeed");
            assert_eq!(current.status, status);
        }
        assert!(current.completed_at.is_none());

        for priority in 0..=4 {
            current = service
                .update_task(task_update(current.id, |input| {
                    input.priority = Some(priority)
                }))
                .await
                .expect("priority update should succeed");
            assert_eq!(current.priority, priority);
        }
    }

    #[tokio::test]
    async fn task_update_should_reject_cross_space_project_before_writing() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let task = create_task(&database, "归属校验任务").await;
        let default_space = SpaceRepository::new(database.connection().clone())
            .list_visible()
            .await
            .expect("default space should be present")
            .into_iter()
            .next()
            .expect("a visible default space should exist");
        let other_space = build_space_service(database.connection().clone())
            .create_space(CreateSpaceInput {
                name: "另一个空间".to_owned(),
                icon_key: "folder".to_owned(),
                color_key: "blue".to_owned(),
            })
            .await
            .expect("second space should create");
        let project = build_project_service(database.connection().clone())
            .create_project(CreateProjectInput {
                space_id: default_space.id,
                name: "默认空间项目".to_owned(),
                description: None,
                status: None,
                priority: None,
                planned_at: None,
                due_at: None,
                remind_at: None,
            })
            .await
            .expect("project should create");

        let error = AppError::from(
            build_task_service(database.connection().clone())
                .update_task(task_update(task.id, |input| {
                    input.placement = Some(UpdateTaskPlacementInput {
                        kind: TaskWritePlacementKind::Project,
                        space_id: other_space.id,
                        project_id: Some(project.id),
                    });
                }))
                .await
                .expect_err("cross-space project should be rejected"),
        );

        assert!(matches!(error, AppError::Validation(_)));
    }

    #[tokio::test]
    async fn create_task_should_persist_all_confirmed_fields() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let space = SpaceRepository::new(database.connection().clone())
            .list_visible()
            .await
            .expect("default space should be present")
            .into_iter()
            .next()
            .expect("a visible default space should exist");
        let project = build_project_service(database.connection().clone())
            .create_project(CreateProjectInput {
                space_id: space.id.clone(),
                name: "任务项目".to_owned(),
                description: None,
                status: None,
                priority: None,
                planned_at: None,
                due_at: None,
                remind_at: None,
            })
            .await
            .expect("project should create");

        let task = build_task_service(database.connection().clone())
            .create_task(CreateTaskInput {
                space_id: Some(space.id),
                placement: CreateTaskPlacementInput {
                    kind: TaskWritePlacementKind::Project,
                    project_id: Some(project.id.clone()),
                },
                title: "完整字段任务".to_owned(),
                note: Some("描述".to_owned()),
                status: Some(WorkStatus::Doing),
                priority: Some(3),
                planned_at: Some("2026-07-22T09:00:00Z".to_owned()),
                due_at: Some("2026-07-23T09:00:00Z".to_owned()),
                remind_at: Some("2026-07-22T10:00:00Z".to_owned()),
            })
            .await
            .expect("task should create");

        assert_eq!(task.project_id.as_deref(), Some(project.id.as_str()));
        assert_eq!(task.status, WorkStatus::Doing);
        assert_eq!(task.priority, 3);
        assert!(task.planned_at.is_some() && task.due_at.is_some() && task.remind_at.is_some());
    }

    #[tokio::test]
    async fn all_space_task_query_should_keep_task_fields() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let default_task = create_task(&database, "默认空间任务").await;
        let second_space = build_space_service(database.connection().clone())
            .create_space(CreateSpaceInput {
                name: "第二空间".to_owned(),
                icon_key: "folder".to_owned(),
                color_key: "blue".to_owned(),
            })
            .await
            .expect("second space should create");
        let second_task = build_task_service(database.connection().clone())
            .create_task(CreateTaskInput {
                space_id: Some(second_space.id),
                placement: CreateTaskPlacementInput {
                    kind: TaskWritePlacementKind::Standalone,
                    project_id: None,
                },
                title: "第二空间任务".to_owned(),
                note: Some("保留字段".to_owned()),
                status: Some(WorkStatus::Doing),
                priority: Some(2),
                due_at: Some("2026-07-23T09:00:00Z".to_owned()),
                planned_at: None,
                remind_at: None,
            })
            .await
            .expect("second task should create");

        let tasks = build_task_service(database.connection().clone())
            .list_tasks(ListTasksInput {
                scope: TaskScopeInput {
                    kind: TaskScopeKind::All,
                    space_id: None,
                },
                view_key: "all".to_owned(),
                placement: ListTasksPlacementInput {
                    kind: ListTasksPlacementKind::All,
                    project_id: None,
                },
                statuses: None,
                priorities: None,
                date_filter: None,
                limit: None,
                cursor: None,
            })
            .await
            .expect("all-space query should succeed");

        assert_eq!(tasks.items.len(), 2);
        assert!(tasks.items.iter().any(|task| task.id == default_task.id));
        let listed_second_task = tasks
            .items
            .iter()
            .find(|task| task.id == second_task.id)
            .expect("second task should be returned");
        // 列表投影不含 note；标题/优先级/日期仍应完整
        assert_eq!(listed_second_task.title, "第二空间任务");
        assert_eq!(listed_second_task.priority, 2);
        assert!(listed_second_task.due_at.is_some());
        let detail = build_task_service(database.connection().clone())
            .get_task_detail(TaskIdInput {
                task_id: second_task.id.clone(),
            })
            .await
            .expect("detail should load note");
        assert_eq!(detail.note.as_deref(), Some("保留字段"));
    }

    #[tokio::test]
    async fn permanently_deleting_a_task_should_remove_its_links_and_activity() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let task = create_task(&database, "待彻底删除").await;
        build_task_link_service(database.connection().clone())
            .create_task_link(CreateTaskLinkInput {
                task_id: task.id.clone(),
                title: "参考链接".to_owned(),
                url: "https://example.com".to_owned(),
            })
            .await
            .expect("task link should create");
        let service = build_task_service(database.connection().clone());

        let active_task_error = AppError::from(
            service
                .permanently_delete_task(TaskIdInput {
                    task_id: task.id.clone(),
                })
                .await
                .expect_err("active task should not permanently delete"),
        );
        assert!(matches!(active_task_error, AppError::Conflict(_)));

        service
            .archive_task(TaskIdInput {
                task_id: task.id.clone(),
            })
            .await
            .expect("task should archive");
        service
            .delete_task(TaskIdInput {
                task_id: task.id.clone(),
            })
            .await
            .expect("archived task should move to trash");
        service
            .permanently_delete_task(TaskIdInput {
                task_id: task.id.clone(),
            })
            .await
            .expect("trashed task should permanently delete");

        assert_eq!(
            task_link::Entity::find()
                .filter(task_link::Column::TaskId.eq(&task.id))
                .count(database.connection())
                .await
                .expect("link count should succeed"),
            0
        );
        assert_eq!(
            activity_event::Entity::find()
                .filter(activity_event::Column::EntityId.eq(&task.id))
                .count(database.connection())
                .await
                .expect("activity count should succeed"),
            0
        );
    }

    async fn create_task(database: &TestDatabase, title: &str) -> TaskDetailDto {
        let space = SpaceRepository::new(database.connection().clone())
            .list_visible()
            .await
            .expect("default space should be present")
            .into_iter()
            .next()
            .expect("a visible default space should exist");
        build_task_service(database.connection().clone())
            .create_task(CreateTaskInput {
                space_id: Some(space.id.clone()),
                placement: CreateTaskPlacementInput {
                    kind: TaskWritePlacementKind::Standalone,
                    project_id: None,
                },
                title: title.to_owned(),
                note: None,
                status: None,
                priority: None,
                due_at: None,
                planned_at: None,
                remind_at: None,
            })
            .await
            .expect("task should create")
    }

    fn task_update(task_id: String, update: impl FnOnce(&mut UpdateTaskInput)) -> UpdateTaskInput {
        let mut input = UpdateTaskInput {
            task_id,
            title: None,
            note: None,
            status: None,
            priority: None,
            placement: None,
            due_at: None,
            planned_at: None,
            remind_at: None,
            position: None,
        };
        update(&mut input);
        input
    }

    async fn assert_lifecycle_operation(
        database: &TestDatabase,
        operation_id: &str,
        task_ids: &[&str],
    ) {
        let expected_task_ids = task_ids
            .iter()
            .map(|task_id| (*task_id).to_owned())
            .collect::<HashSet<_>>();
        let outbox_task_ids = outbox::Entity::find()
            .filter(outbox::Column::OperationId.eq(operation_id))
            .all(database.connection())
            .await
            .expect("lifecycle outbox rows should be readable")
            .into_iter()
            .map(|row| row.entity_id)
            .collect::<HashSet<_>>();
        assert_eq!(outbox_task_ids, expected_task_ids);

        let activity_task_ids = activity_event::Entity::find()
            .filter(activity_event::Column::OperationId.eq(operation_id))
            .all(database.connection())
            .await
            .expect("lifecycle activity rows should be readable")
            .into_iter()
            .map(|row| row.entity_id)
            .collect::<HashSet<_>>();
        assert_eq!(activity_task_ids, expected_task_ids);
    }
}
