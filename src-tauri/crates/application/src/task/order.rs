//! Task 总序：同一键序列用于仓储排序、keyset 比较与 cursor 元组。

use serde::{Deserialize, Serialize};
use stoneflow_domain::WorkStatus;

use crate::{view::ViewTaskRecord, ApplicationError};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TaskOrderBy {
    Smart,
    Manual,
    Priority,
    Status,
    DueAt,
    PlannedAt,
    StatusChangedAt,
    CreatedAt,
    UpdatedAt,
    CompletedAt,
    CanceledAt,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskOrderDirection {
    Asc,
    Desc,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskCompletedOrder {
    Natural,
    Recency,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TaskQueryOrder {
    pub order_by: TaskOrderBy,
    pub order_direction: TaskOrderDirection,
    pub completed_order: TaskCompletedOrder,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskOrderField {
    IsDone,
    Position,
    Status,
    Priority,
    EffectiveAt,
    DueAt,
    PlannedAt,
    StatusChangedAt,
    CreatedAt,
    UpdatedAt,
    CompletedAt,
    CanceledAt,
    Id,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskOrderPartition {
    All,
    Done,
    NotDone,
}

/// 每个键都将 NULL 置后；partition 外的行投影为 NULL。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TaskOrderTerm {
    pub field: TaskOrderField,
    pub direction: TaskOrderDirection,
    pub partition: TaskOrderPartition,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum TaskOrderValue {
    Integer(i64),
    Text(String),
}

pub type TaskOrderTuple = Vec<Option<TaskOrderValue>>;

impl TaskQueryOrder {
    pub fn normalized(mut self) -> Self {
        if matches!(self.order_by, TaskOrderBy::Smart | TaskOrderBy::Manual) {
            self.order_direction = TaskOrderDirection::Asc;
        }
        self
    }

    pub fn terms(self) -> Vec<TaskOrderTerm> {
        use TaskOrderDirection::{Asc, Desc};
        use TaskOrderField as Field;
        let ordinary = match self.order_by {
            TaskOrderBy::Manual => vec![(Field::Position, Asc)],
            TaskOrderBy::Smart => vec![
                (Field::Status, Asc),
                (Field::EffectiveAt, Asc),
                (Field::Priority, Desc),
                (Field::UpdatedAt, Desc),
                (Field::CreatedAt, Desc),
            ],
            order_by => {
                let field = match order_by {
                    TaskOrderBy::Priority => Field::Priority,
                    TaskOrderBy::Status => Field::Status,
                    TaskOrderBy::DueAt => Field::DueAt,
                    TaskOrderBy::PlannedAt => Field::PlannedAt,
                    TaskOrderBy::StatusChangedAt => Field::StatusChangedAt,
                    TaskOrderBy::CreatedAt => Field::CreatedAt,
                    TaskOrderBy::UpdatedAt => Field::UpdatedAt,
                    TaskOrderBy::CompletedAt => Field::CompletedAt,
                    TaskOrderBy::CanceledAt => Field::CanceledAt,
                    TaskOrderBy::Smart | TaskOrderBy::Manual => unreachable!(),
                };
                let mut terms = vec![(field, self.order_direction)];
                if field != Field::UpdatedAt {
                    terms.push((Field::UpdatedAt, Desc));
                }
                terms
            }
        };
        let mut terms = Vec::new();
        let partition = if self.completed_order == TaskCompletedOrder::Recency {
            terms.push(TaskOrderTerm {
                field: Field::IsDone,
                direction: Asc,
                partition: TaskOrderPartition::All,
            });
            terms.push(TaskOrderTerm {
                field: Field::CompletedAt,
                direction: Desc,
                partition: TaskOrderPartition::Done,
            });
            TaskOrderPartition::NotDone
        } else {
            TaskOrderPartition::All
        };
        terms.extend(
            ordinary
                .into_iter()
                .map(|(field, direction)| TaskOrderTerm {
                    field,
                    direction,
                    partition,
                }),
        );
        terms.push(TaskOrderTerm {
            field: Field::Id,
            direction: Asc,
            partition: TaskOrderPartition::All,
        });
        terms
    }

    pub fn tuple(self, task: &ViewTaskRecord) -> TaskOrderTuple {
        self.terms().iter().map(|term| term.value(task)).collect()
    }

    pub fn validate_tuple(self, values: &TaskOrderTuple) -> Result<(), ApplicationError> {
        let terms = self.terms();
        if terms.len() != values.len() {
            return Err(invalid_cursor());
        }
        let done = match values.first() {
            Some(Some(TaskOrderValue::Integer(value)))
                if self.completed_order == TaskCompletedOrder::Recency =>
            {
                *value == 1
            }
            _ => false,
        };
        for (term, value) in terms.iter().zip(values) {
            let outside_partition = matches!(term.partition, TaskOrderPartition::Done) && !done
                || matches!(term.partition, TaskOrderPartition::NotDone) && done;
            if outside_partition {
                if value.is_some() {
                    return Err(invalid_cursor());
                }
                continue;
            }
            let valid = match (&term.field, value) {
                (TaskOrderField::IsDone, Some(TaskOrderValue::Integer(value))) => {
                    (0..=1).contains(value)
                }
                (TaskOrderField::Position, Some(TaskOrderValue::Integer(value))) => *value >= 0,
                (
                    TaskOrderField::Priority | TaskOrderField::Status,
                    Some(TaskOrderValue::Integer(value)),
                ) => (0..=4).contains(value),
                (TaskOrderField::Id, Some(TaskOrderValue::Text(value))) => !value.is_empty(),
                (field, Some(TaskOrderValue::Text(value))) if field.is_date() => {
                    chrono::DateTime::parse_from_rfc3339(value).is_ok()
                }
                (field, None) => field.is_nullable(),
                _ => false,
            };
            if !valid {
                return Err(invalid_cursor());
            }
        }
        Ok(())
    }
}

impl TaskOrderField {
    pub fn is_date(self) -> bool {
        matches!(
            self,
            Self::EffectiveAt
                | Self::DueAt
                | Self::PlannedAt
                | Self::StatusChangedAt
                | Self::CreatedAt
                | Self::UpdatedAt
                | Self::CompletedAt
                | Self::CanceledAt
        )
    }

    fn is_nullable(self) -> bool {
        matches!(
            self,
            Self::EffectiveAt
                | Self::DueAt
                | Self::PlannedAt
                | Self::CompletedAt
                | Self::CanceledAt
        )
    }
}

impl TaskOrderTerm {
    pub fn can_be_null(self) -> bool {
        self.partition != TaskOrderPartition::All || self.field.is_nullable()
    }

    fn value(self, task: &ViewTaskRecord) -> Option<TaskOrderValue> {
        let done = task.status == WorkStatus::Done;
        if matches!(self.partition, TaskOrderPartition::Done) && !done
            || matches!(self.partition, TaskOrderPartition::NotDone) && done
        {
            return None;
        }
        use TaskOrderValue::{Integer, Text};
        Some(match self.field {
            TaskOrderField::IsDone => Integer(i64::from(done)),
            TaskOrderField::Position => Integer(task.position),
            TaskOrderField::Status => Integer(match task.status {
                WorkStatus::Doing => 0,
                WorkStatus::Todo => 1,
                WorkStatus::Waiting => 2,
                WorkStatus::Done => 3,
                WorkStatus::Canceled => 4,
            }),
            TaskOrderField::Priority => Integer(i64::from(task.priority)),
            TaskOrderField::EffectiveAt => {
                Text(task.due_at.as_ref().or(task.planned_at.as_ref())?.clone())
            }
            TaskOrderField::DueAt => Text(task.due_at.clone()?),
            TaskOrderField::PlannedAt => Text(task.planned_at.clone()?),
            TaskOrderField::StatusChangedAt => Text(task.status_changed_at.clone()),
            TaskOrderField::CreatedAt => Text(task.created_at.clone()),
            TaskOrderField::UpdatedAt => Text(task.updated_at.clone()),
            TaskOrderField::CompletedAt => Text(task.completed_at.clone()?),
            TaskOrderField::CanceledAt => {
                if task.status != WorkStatus::Canceled {
                    return None;
                }
                Text(task.status_changed_at.clone())
            }
            TaskOrderField::Id => Text(task.id.clone()),
        })
    }
}

pub(crate) fn invalid_cursor() -> ApplicationError {
    ApplicationError::validation("列表 cursor 无效或已失效，请从首屏重新加载")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        task::executor::{decode_task_query_cursor, encode_task_query_cursor, TaskQueryIdentity},
        view::{
            FilterClauseValue, FilterQueryValue, TaskScopeInput, TaskScopeKind, TaskViewBaseKey,
            TaskViewContext, ViewDateBoundaries,
        },
    };

    fn task() -> ViewTaskRecord {
        ViewTaskRecord {
            id: "task-1".to_owned(),
            space_id: "space-1".to_owned(),
            project_id: None,
            title: "Task".to_owned(),
            status: WorkStatus::Todo,
            status_changed_at: "2026-09-01T00:00:00Z".to_owned(),
            priority: 4,
            planned_at: Some("2026-09-14T09:00:00+08:00".to_owned()),
            due_at: Some("2026-09-15T09:00:00+08:00".to_owned()),
            remind_at: None,
            position: 123,
            completed_at: None,
            archived_at: None,
            created_at: "2026-08-01T00:00:00Z".to_owned(),
            updated_at: "2026-09-02T00:00:00Z".to_owned(),
        }
    }

    fn order(order_by: TaskOrderBy, completed_order: TaskCompletedOrder) -> TaskQueryOrder {
        TaskQueryOrder {
            order_by,
            order_direction: TaskOrderDirection::Asc,
            completed_order,
        }
    }

    fn identity(
        filters: &FilterQueryValue,
        order: TaskQueryOrder,
        date: &str,
    ) -> TaskQueryIdentity {
        TaskQueryIdentity::new(
            &TaskScopeInput {
                kind: TaskScopeKind::All,
                space_id: None,
            },
            &TaskViewContext::All,
            TaskViewBaseKey::All,
            filters,
            order,
            date,
        )
    }

    fn dates() -> ViewDateBoundaries {
        ViewDateBoundaries {
            today_start: "2026-09-12T16:00:00Z".to_owned(),
            tomorrow_start: "2026-09-13T16:00:00Z".to_owned(),
            day_after_tomorrow_start: "2026-09-14T16:00:00Z".to_owned(),
            next_week_start: "2026-09-13T16:00:00Z".to_owned(),
        }
    }

    #[test]
    fn all_supported_orders_produce_complete_valid_tuples_for_nulls_and_done_partitions() {
        for order_by in [
            TaskOrderBy::Smart,
            TaskOrderBy::Manual,
            TaskOrderBy::Priority,
            TaskOrderBy::Status,
            TaskOrderBy::DueAt,
            TaskOrderBy::PlannedAt,
            TaskOrderBy::StatusChangedAt,
            TaskOrderBy::CreatedAt,
            TaskOrderBy::UpdatedAt,
            TaskOrderBy::CompletedAt,
            TaskOrderBy::CanceledAt,
        ] {
            for completed_order in [TaskCompletedOrder::Natural, TaskCompletedOrder::Recency] {
                for direction in [TaskOrderDirection::Asc, TaskOrderDirection::Desc] {
                    let order = TaskQueryOrder {
                        order_direction: direction,
                        ..order(order_by, completed_order)
                    };
                    for status in [WorkStatus::Todo, WorkStatus::Done, WorkStatus::Canceled] {
                        let mut task = task();
                        task.status = status;
                        for date in [None, Some("2026-09-12T13:00:00+08:00".to_owned())] {
                            task.completed_at = date.clone();
                            task.due_at = date.clone();
                            task.planned_at = date;
                            order.validate_tuple(&order.tuple(&task)).unwrap();
                        }
                    }
                }
            }
        }
    }

    #[test]
    fn manual_ignores_metadata_and_recency_overrides_only_done_positions() {
        let mut original = task();
        let manual = order(TaskOrderBy::Manual, TaskCompletedOrder::Natural);
        let before = manual.tuple(&original);
        original.updated_at = "2026-09-13T12:00:00Z".to_owned();
        original.title = "Edited".to_owned();
        original.priority = 1;
        assert_eq!(manual.tuple(&original), before);
        original.position += 1;
        assert_ne!(manual.tuple(&original), before);

        let recency = order(TaskOrderBy::Manual, TaskCompletedOrder::Recency);
        original.status = WorkStatus::Done;
        original.completed_at = Some("2026-09-13T09:00:00Z".to_owned());
        let completed = recency.tuple(&original);
        original.position += 100;
        original.updated_at = "2026-09-13T14:00:00Z".to_owned();
        assert_eq!(recency.tuple(&original), completed);
        assert_ne!(manual.tuple(&original), before);
    }

    #[test]
    fn smart_uses_due_before_planned_and_fixed_business_status_order() {
        let smart = order(TaskOrderBy::Smart, TaskCompletedOrder::Natural);
        let mut task = task();
        assert_eq!(
            smart.tuple(&task),
            vec![
                Some(TaskOrderValue::Integer(1)),
                Some(TaskOrderValue::Text(task.due_at.clone().unwrap())),
                Some(TaskOrderValue::Integer(4)),
                Some(TaskOrderValue::Text(task.updated_at.clone())),
                Some(TaskOrderValue::Text(task.created_at.clone())),
                Some(TaskOrderValue::Text(task.id.clone())),
            ]
        );
        task.due_at = None;
        assert_eq!(
            smart.tuple(&task)[1],
            task.planned_at.map(TaskOrderValue::Text)
        );
        assert_eq!(
            TaskQueryOrder {
                order_direction: TaskOrderDirection::Desc,
                ..smart
            }
            .normalized(),
            smart
        );
    }

    #[test]
    fn cursor_binds_semantic_query_order_and_date_and_preserves_original_boundaries() {
        let filters = FilterQueryValue {
            clauses: vec![FilterClauseValue {
                id: "original".to_owned(),
                field: "status".to_owned(),
                op: "is_not".to_owned(),
                values: vec!["done".to_owned(), "canceled".to_owned()],
            }],
        };
        let order = order(TaskOrderBy::Priority, TaskCompletedOrder::Natural);
        let query = identity(&filters, order, "2026-09-13");
        let encoded = encode_task_query_cursor(&query, &dates(), &task()).unwrap();
        let mut equivalent = filters.clone();
        equivalent.clauses[0].id = "new-id".to_owned();
        equivalent.clauses[0].values.reverse();
        equivalent.clauses.push(equivalent.clauses[0].clone());
        let equivalent = identity(&equivalent, order, "2026-09-13");
        let (cursor, actual_dates) = decode_task_query_cursor(&encoded, &equivalent).unwrap();
        assert_eq!(cursor.values, order.tuple(&task()));
        assert_eq!(actual_dates, dates());
        for wrong_query in [
            identity(&FilterQueryValue::default(), order, "2026-09-13"),
            identity(
                &filters,
                TaskQueryOrder {
                    order_direction: TaskOrderDirection::Desc,
                    ..order
                },
                "2026-09-13",
            ),
            identity(&filters, order, "2026-09-14"),
        ] {
            assert!(decode_task_query_cursor(&encoded, &wrong_query).is_err());
        }
        for damaged in ["invalid", "100\u{1f}task-1", "{}"] {
            assert!(decode_task_query_cursor(damaged, &query).is_err());
        }
        let payload: serde_json::Value = serde_json::from_str(&encoded).unwrap();
        for (field, value) in [
            ("version", serde_json::json!(2)),
            ("values", serde_json::json!([4, null, "task-1"])),
            ("values", serde_json::json!([4, "bad-date", "task-1"])),
            ("values", serde_json::json!([4, "2026-09-02T00:00:00Z"])),
            ("dates", serde_json::json!({})),
        ] {
            let mut damaged = payload.clone();
            damaged[field] = value;
            assert!(decode_task_query_cursor(&damaged.to_string(), &query).is_err());
        }
    }
}
