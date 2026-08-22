//! FilterQuery 持久化形状：与前端 `FilterQuery` 对齐。
//! 旧扁平筛选 DTO 只在本存储解码边界私有转换一次。

use crate::ApplicationError;
use serde::{Deserialize, Serialize};
use stoneflow_domain::WorkStatus;

const PROJECT_NONE: &str = "__none__";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct LegacyTaskViewFilters {
    #[serde(default)]
    status: Vec<WorkStatus>,
    priority: Option<LegacyPriorityFilter>,
    project: Option<LegacyProjectFilter>,
    due: Option<LegacyDateFilter>,
    planned: Option<LegacyDateFilter>,
    created: Option<LegacyDateFilter>,
    updated: Option<LegacyDateFilter>,
    completed: Option<LegacyDateFilter>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct LegacyPriorityFilter {
    eq: Option<i32>,
    gte: Option<i32>,
    lte: Option<i32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct LegacyProjectFilter {
    mode: LegacyProjectFilterMode,
    #[serde(default)]
    ids: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum LegacyProjectFilterMode {
    Any,
    None,
    Specific,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct LegacyDateFilter {
    mode: LegacyDateFilterMode,
    #[serde(rename = "from")]
    _from: Option<String>,
    #[serde(rename = "to")]
    _to: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum LegacyDateFilterMode {
    Today,
    Overdue,
    Future,
    Past,
    Between,
    None,
    NotNone,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FilterQueryValue {
    #[serde(default)]
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

/// 解析 filters_json：新 clause 形状，或旧扁平筛选 → clause（无长期双路径分支在调用方）。
pub fn parse_filters_json(json: &str) -> Result<FilterQueryValue, ApplicationError> {
    let trimmed = json.trim();
    if trimmed.is_empty() || trimmed == "null" {
        return Ok(FilterQueryValue::default());
    }
    let value: serde_json::Value = serde_json::from_str(trimmed)
        .map_err(|_| ApplicationError::validation("View filters 定义无效"))?;

    if value
        .as_object()
        .is_some_and(|obj| obj.contains_key("clauses"))
    {
        return serde_json::from_value(value)
            .map_err(|_| ApplicationError::validation("View filters 定义无效"));
    }

    // 旧扁平形状
    let legacy: LegacyTaskViewFilters = serde_json::from_value(value)
        .map_err(|_| ApplicationError::validation("View filters 定义无效"))?;
    legacy_to_filter_query(legacy)
}

fn legacy_to_filter_query(
    legacy: LegacyTaskViewFilters,
) -> Result<FilterQueryValue, ApplicationError> {
    if legacy.created.is_some() || legacy.updated.is_some() || legacy.completed.is_some() {
        return Err(ApplicationError::validation(
            "旧 Saved View 含当前模型无法无损表达的日期字段，请重新创建",
        ));
    }
    let mut clauses = Vec::new();

    if !legacy.status.is_empty() {
        clauses.push(FilterClauseValue {
            id: "migrated-status".to_owned(),
            field: "status".to_owned(),
            op: "is".to_owned(),
            values: legacy
                .status
                .iter()
                .map(|s| status_to_str(*s).to_owned())
                .collect(),
        });
    }

    if let Some(priority) = legacy.priority {
        if let Some(eq) = priority.eq {
            if priority.gte.is_some_and(|gte| eq < gte) || priority.lte.is_some_and(|lte| eq > lte)
            {
                return Err(ApplicationError::validation(
                    "旧 Saved View 的优先级条件无法无损迁移，请重新创建",
                ));
            }
            clauses.push(FilterClauseValue {
                id: "migrated-priority".to_owned(),
                field: "priority".to_owned(),
                op: "is".to_owned(),
                values: vec![eq.to_string()],
            });
        } else {
            let mut values = Vec::new();
            for p in 0..=4 {
                let ok_gte = priority.gte.is_none_or(|g| p >= g);
                let ok_lte = priority.lte.is_none_or(|l| p <= l);
                if ok_gte && ok_lte {
                    values.push(p.to_string());
                }
            }
            if values.is_empty() {
                return Err(ApplicationError::validation(
                    "旧 Saved View 的优先级条件无法无损迁移，请重新创建",
                ));
            }
            clauses.push(FilterClauseValue {
                id: "migrated-priority".to_owned(),
                field: "priority".to_owned(),
                op: "is".to_owned(),
                values,
            });
        }
    }

    if let Some(project) = legacy.project {
        match project.mode {
            LegacyProjectFilterMode::None => clauses.push(FilterClauseValue {
                id: "migrated-project".to_owned(),
                field: "project".to_owned(),
                op: "is".to_owned(),
                values: vec![PROJECT_NONE.to_owned()],
            }),
            LegacyProjectFilterMode::Specific if !project.ids.is_empty() => {
                clauses.push(FilterClauseValue {
                    id: "migrated-project".to_owned(),
                    field: "project".to_owned(),
                    op: "is".to_owned(),
                    values: project.ids,
                })
            }
            LegacyProjectFilterMode::Specific => {
                return Err(ApplicationError::validation(
                    "旧 Saved View 的项目条件无法无损迁移，请重新创建",
                ));
            }
            _ => {}
        }
    }

    if let Some(due) = legacy.due {
        if let Some(mode) = date_mode_to_value(due.mode)? {
            clauses.push(FilterClauseValue {
                id: "migrated-due".to_owned(),
                field: "due".to_owned(),
                op: "is".to_owned(),
                values: vec![mode.to_owned()],
            });
        }
    }

    if let Some(planned) = legacy.planned {
        if let Some(mode) = date_mode_to_value(planned.mode)? {
            clauses.push(FilterClauseValue {
                id: "migrated-planned".to_owned(),
                field: "planned".to_owned(),
                op: "is".to_owned(),
                values: vec![mode.to_owned()],
            });
        }
    }

    Ok(FilterQueryValue { clauses })
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
            "priority" => clause.values.iter().all(|value| {
                value
                    .parse::<i32>()
                    .is_ok_and(|priority| (0..=4).contains(&priority))
            }),
            "project" => clause.values.iter().all(|value| !value.trim().is_empty()),
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

fn date_mode_to_value(
    mode: LegacyDateFilterMode,
) -> Result<Option<&'static str>, ApplicationError> {
    match mode {
        LegacyDateFilterMode::Today => Ok(Some("today")),
        LegacyDateFilterMode::Overdue | LegacyDateFilterMode::Past => Ok(Some("overdue")),
        LegacyDateFilterMode::Future => Ok(Some("future")),
        LegacyDateFilterMode::NotNone => Ok(Some("hasDate")),
        LegacyDateFilterMode::None => Ok(Some("noDate")),
        LegacyDateFilterMode::Between => Err(ApplicationError::validation(
            "旧 Saved View 含当前模型无法无损表达的日期条件，请重新创建",
        )),
    }
}

fn status_to_str(status: WorkStatus) -> &'static str {
    match status {
        WorkStatus::Todo => "todo",
        WorkStatus::Doing => "doing",
        WorkStatus::Waiting => "waiting",
        WorkStatus::Done => "done",
        WorkStatus::Canceled => "canceled",
    }
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
    fn parse_new_shape() {
        let json = r#"{"clauses":[{"id":"1","field":"status","op":"is","values":["todo"]}]}"#;
        let q = parse_filters_json(json).unwrap();
        assert_eq!(q.clauses.len(), 1);
        assert_eq!(q.clauses[0].field, "status");
    }

    #[test]
    fn parse_legacy_status() {
        let json = r#"{"status":["todo","doing"]}"#;
        let q = parse_filters_json(json).unwrap();
        assert_eq!(q.clauses.len(), 1);
        assert_eq!(q.clauses[0].values, vec!["todo", "doing"]);
    }

    #[test]
    fn legacy_future_should_keep_its_full_range() {
        let q = parse_filters_json(r#"{"due":{"mode":"future","from":null,"to":null}}"#).unwrap();

        assert_eq!(q.clauses[0].values, vec!["future"]);
    }

    #[test]
    fn unsupported_legacy_filters_should_fail_instead_of_changing_semantics() {
        for json in [
            r#"{"planned":{"mode":"between","from":null,"to":null}}"#,
            r#"{"created":{"mode":"today","from":null,"to":null}}"#,
            r#"{"project":{"mode":"specific","ids":[]}}"#,
            r#"{"priority":{"eq":1,"gte":3,"lte":null}}"#,
        ] {
            assert!(parse_filters_json(json).is_err(), "{json}");
        }
    }
}
