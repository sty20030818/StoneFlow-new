//! 只读取分组路径与 COUNT；与任务窗口共用成员谓词和分组 SQL 键。

use sea_orm::{
    sea_query::Expr, ColumnTrait, ConnectionTrait, EntityTrait, QueryResult, QuerySelect,
    QueryTrait,
};
use stoneflow_application::{
    task::{TaskDateBucket, TaskGroupBy, TaskGroupCount, TaskQueryGroup, TASK_GROUP_STATUS_ORDER},
    view::ViewTaskQuery,
};

use super::{view_order::order_expression, view_query::apply_view_task_filters, TaskRepository};
use crate::{entities::task, error::StorageError};

impl TaskRepository {
    pub async fn group_counts_for_view(
        &self,
        connection: &impl ConnectionTrait,
        definition: &ViewTaskQuery,
    ) -> Result<Vec<TaskGroupCount>, StorageError> {
        let order = definition.order.normalized();
        let mut query = apply_view_task_filters(task::Entity::find(), definition)?
            .select_only()
            .column_as(task::Column::Id.count(), "total_count");
        for (prefix, group_by) in [("main", order.group_by), ("sub", order.sub_group_by)] {
            for (index, term) in group_by.order_terms().into_iter().enumerate() {
                let alias = format!("{prefix}_{index}");
                query = query
                    .column_as(order_expression(term, &definition.dates), alias.clone())
                    .group_by(Expr::col(alias));
            }
        }
        let statement = query.build(connection.get_database_backend());
        connection
            .query_all_raw(statement)
            .await?
            .into_iter()
            .map(|row| {
                let count: i64 = row.try_get("", "total_count")?;
                Ok(TaskGroupCount {
                    group: read_group(&row, "main", order.group_by)?,
                    sub_group: read_group(&row, "sub", order.sub_group_by)?,
                    total_count: u64::try_from(count)
                        .map_err(|_| StorageError::validation("分组计数无效"))?,
                })
            })
            .collect()
    }
}

fn read_group(
    row: &QueryResult,
    prefix: &str,
    group_by: TaskGroupBy,
) -> Result<TaskQueryGroup, StorageError> {
    let integer = || row.try_get::<i64>("", &format!("{prefix}_0"));
    let invalid = || StorageError::validation("分组聚合键无效");
    Ok(match group_by {
        TaskGroupBy::None => TaskQueryGroup::None,
        TaskGroupBy::Status => TaskQueryGroup::Status {
            status: *TASK_GROUP_STATUS_ORDER
                .get(usize::try_from(integer()?).map_err(|_| invalid())?)
                .ok_or_else(invalid)?,
        },
        TaskGroupBy::Priority => TaskQueryGroup::Priority {
            priority: i32::try_from(integer()?).map_err(|_| invalid())?,
        },
        TaskGroupBy::Project => {
            let project_id: Option<String> = row.try_get("", &format!("{prefix}_2"))?;
            let project_name = if project_id.is_some() {
                Some(row.try_get("", &format!("{prefix}_1"))?)
            } else {
                None
            };
            TaskQueryGroup::Project {
                project_id,
                project_name,
            }
        }
        TaskGroupBy::Due | TaskGroupBy::Scheduled => {
            let bucket = *TaskDateBucket::ALL
                .get(usize::try_from(integer()?).map_err(|_| invalid())?)
                .ok_or_else(invalid)?;
            if group_by == TaskGroupBy::Due {
                TaskQueryGroup::Due { bucket }
            } else {
                TaskQueryGroup::Scheduled { bucket }
            }
        }
    })
}
