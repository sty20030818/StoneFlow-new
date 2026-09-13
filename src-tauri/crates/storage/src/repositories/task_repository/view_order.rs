//! 用同一组总序键生成 ORDER BY 与 keyset，始终在 LIMIT 之前执行。

use sea_orm::{
    sea_query::{Expr, SimpleExpr},
    Condition, ExprTrait, Order, QueryFilter, QueryOrder, Select,
};
use stoneflow_application::{
    task::{TaskOrderDirection, TaskOrderField, TaskOrderPartition, TaskOrderTerm, TaskOrderValue},
    view::{ViewDateBoundaries, ViewTaskQuery},
};

use super::view_date::sqlite_date_expression;
use crate::{entities::task::Entity as Task, error::StorageError};

pub(super) fn apply_view_task_order(
    mut query: Select<Task>,
    definition: &ViewTaskQuery,
) -> Result<Select<Task>, StorageError> {
    let terms = definition.order.terms();
    if let Some(cursor) = &definition.cursor {
        definition
            .order
            .validate_tuple(&cursor.values)
            .map_err(|error| StorageError::validation(error.to_string()))?;
        let mut after = Condition::any();
        let mut prefix = Condition::all();
        for (term, value) in terms.iter().zip(&cursor.values) {
            let expression = order_expression(*term, &definition.dates);
            if let Some(value) = value {
                let value = cursor_expression(term.field, value);
                let comparison = match term.direction {
                    TaskOrderDirection::Asc => expression.clone().gt(value.clone()),
                    TaskOrderDirection::Desc => expression.clone().lt(value.clone()),
                };
                let mut later = Condition::any().add(comparison);
                if term.can_be_null() {
                    later = later.add(expression.clone().is_null());
                }
                after = after.add(prefix.clone().add(later));
                prefix = prefix.add(expression.eq(value));
            } else {
                // NULL 已在末尾；只允许后续键推进，不能从 NULL 回到非空值。
                prefix = prefix.add(expression.is_null());
            }
        }
        query = query.filter(after);
    }
    for term in terms {
        let expression = order_expression(term, &definition.dates);
        if term.can_be_null() {
            query = query.order_by(expression.clone().is_null(), Order::Asc);
        }
        query = query.order_by(
            expression,
            match term.direction {
                TaskOrderDirection::Asc => Order::Asc,
                TaskOrderDirection::Desc => Order::Desc,
            },
        );
    }
    Ok(query)
}

fn order_expression(term: TaskOrderTerm, dates: &ViewDateBoundaries) -> SimpleExpr {
    if matches!(
        term.field,
        TaskOrderField::DueBucket | TaskOrderField::PlannedBucket
    ) {
        return date_bucket_expression(
            if term.field == TaskOrderField::DueBucket {
                "due_at"
            } else {
                "planned_at"
            },
            dates,
        );
    }
    let field = match term.field {
        TaskOrderField::ProjectMissing => "project_id IS NULL",
        TaskOrderField::ProjectName => "COALESCE((SELECT name FROM projects WHERE projects.id = tasks.project_id), '') COLLATE BINARY",
        TaskOrderField::ProjectId => "project_id COLLATE BINARY",
        TaskOrderField::DueBucket | TaskOrderField::PlannedBucket => unreachable!(),
        TaskOrderField::IsDone => "status = 'done'",
        TaskOrderField::Position => "position",
        TaskOrderField::Status => "CASE status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 WHEN 'waiting' THEN 2 WHEN 'done' THEN 3 WHEN 'canceled' THEN 4 END",
        TaskOrderField::Priority => "priority",
        TaskOrderField::EffectiveAt => "COALESCE(due_at, planned_at)",
        TaskOrderField::DueAt => "due_at",
        TaskOrderField::PlannedAt => "planned_at",
        TaskOrderField::StatusChangedAt => "status_changed_at",
        TaskOrderField::CreatedAt => "created_at",
        TaskOrderField::UpdatedAt => "updated_at",
        TaskOrderField::CompletedAt => "completed_at",
        TaskOrderField::CanceledAt => "CASE WHEN status = 'canceled' THEN status_changed_at END",
        TaskOrderField::Id => "id",
    };
    let expression = Expr::cust(match term.partition {
        TaskOrderPartition::All => field.to_owned(),
        TaskOrderPartition::Done => format!("CASE WHEN status = 'done' THEN {field} END"),
        TaskOrderPartition::NotDone => format!("CASE WHEN status <> 'done' THEN {field} END"),
    });
    if term.field.is_date() {
        sqlite_date_expression(expression)
    } else {
        expression
    }
}

fn date_bucket_expression(column: &'static str, dates: &ViewDateBoundaries) -> SimpleExpr {
    let value = sqlite_date_expression(Expr::cust(column));
    Expr::case(Expr::cust(column).is_null(), 5)
        .case(
            value
                .clone()
                .lt(sqlite_date_expression(Expr::val(dates.today_start.clone()))),
            0,
        )
        .case(
            value.clone().lt(sqlite_date_expression(Expr::val(
                dates.tomorrow_start.clone(),
            ))),
            1,
        )
        .case(
            value.clone().lt(sqlite_date_expression(Expr::val(
                dates.day_after_tomorrow_start.clone(),
            ))),
            2,
        )
        .case(
            value.lt(sqlite_date_expression(Expr::val(
                dates.next_week_start.clone(),
            ))),
            3,
        )
        .finally(4)
        .into()
}

fn cursor_expression(field: TaskOrderField, value: &TaskOrderValue) -> SimpleExpr {
    match value {
        TaskOrderValue::Integer(value) => Expr::val(*value).into(),
        TaskOrderValue::Text(value) if field.is_date() => {
            sqlite_date_expression(Expr::val(value.clone()))
        }
        TaskOrderValue::Text(value) => Expr::val(value.clone()).into(),
    }
}

#[cfg(test)]
mod tests;
