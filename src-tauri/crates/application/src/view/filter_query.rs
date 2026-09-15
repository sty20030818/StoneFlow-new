//! FilterQuery 持久化形状：与前端 `FilterQuery` 对齐。

use crate::ApplicationError;
use serde::{Deserialize, Serialize};
use stoneflow_domain::WorkStatus;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FilterQueryValue {
    pub clauses: Vec<FilterClauseValue>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FilterClauseValue {
    #[serde(default)]
    pub id: String,
    pub field: String,
    pub op: String,
    #[serde(default)]
    pub values: Vec<String>,
}

pub fn validate_filter_query(query: &FilterQueryValue) -> Result<(), ApplicationError> {
    for clause in &query.clauses {
        if !matches!(
            clause.field.as_str(),
            "status" | "priority" | "project" | "due" | "planned"
        ) {
            return Err(ApplicationError::validation(format!(
                "不支持的筛选字段: {}",
                clause.field
            )));
        }
        if !matches!(clause.op.as_str(), "is" | "is_not") {
            return Err(ApplicationError::validation(format!(
                "不支持的筛选操作: {}",
                clause.op
            )));
        }
        if clause.values.is_empty() {
            return Err(ApplicationError::validation("筛选条件 values 不能为空"));
        }
        let values_are_valid = match clause.field.as_str() {
            "status" => clause
                .values
                .iter()
                .all(|value| parse_status(value).is_some()),
            "priority" => clause
                .values
                .iter()
                .all(|value| matches!(value.as_str(), "0" | "1" | "2" | "3" | "4")),
            "project" => clause
                .values
                .iter()
                .all(|value| !value.is_empty() && value == value.trim()),
            "due" | "planned" => clause.values.iter().all(|value| {
                matches!(
                    value.as_str(),
                    "today" | "tomorrow" | "thisWeek" | "future" | "overdue" | "hasDate" | "noDate"
                )
            }),
            _ => false,
        };
        if !values_are_valid {
            return Err(ApplicationError::validation(format!(
                "筛选字段 {} 包含无效值",
                clause.field
            )));
        }
    }
    Ok(())
}

fn parse_status(value: &str) -> Option<WorkStatus> {
    match value {
        "todo" => Some(WorkStatus::Todo),
        "doing" => Some(WorkStatus::Doing),
        "waiting" => Some(WorkStatus::Waiting),
        "done" => Some(WorkStatus::Done),
        "canceled" => Some(WorkStatus::Canceled),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn filter_query_requires_explicit_current_shape() {
        for value in ["", "null", "{}", r#"{"status":["todo"]}"#] {
            assert!(
                serde_json::from_str::<FilterQueryValue>(value).is_err(),
                "{value}"
            );
        }
        let query: FilterQueryValue = serde_json::from_str(
            r#"{"clauses":[{"id":"1","field":"status","op":"is","values":["todo"]}]}"#,
        )
        .unwrap();
        assert!(validate_filter_query(&query).is_ok());
    }

    #[test]
    fn validation_rejects_noncanonical_priority_and_padded_project_values() {
        for (field, value) in [
            ("priority", "01"),
            ("priority", "+1"),
            ("priority", "-0"),
            ("project", " project-1"),
            ("project", "project-1 "),
        ] {
            let query = FilterQueryValue {
                clauses: vec![FilterClauseValue {
                    id: "condition".to_owned(),
                    field: field.to_owned(),
                    op: "is".to_owned(),
                    values: vec![value.to_owned()],
                }],
            };
            assert!(validate_filter_query(&query).is_err(), "{field}={value}");
        }
    }
}
