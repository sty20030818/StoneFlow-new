//! FilterQuery 持久化形状：与前端 `FilterQuery` 对齐。
//! 旧 `TaskViewFiltersValue` 仅作执行期 eval / 一次性迁移输入。

use crate::view::{
    DateFilter, DateFilterMode, PriorityFilter, ProjectFilter, ProjectFilterMode,
    TaskViewFiltersValue,
};
use crate::ApplicationError;
use serde::{Deserialize, Serialize};
use stoneflow_domain::WorkStatus;

const PROJECT_NONE: &str = "__none__";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FilterQueryValue {
    #[serde(default)]
    pub clauses: Vec<FilterClauseValue>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilterClauseValue {
    #[serde(default)]
    pub id: String,
    pub field: String,
    pub op: String,
    #[serde(default)]
    pub values: Vec<String>,
}

/// 解析 filters_json：新 clause 形状，或旧扁平 TaskViewFilters → clause（无长期双路径分支在调用方）。
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
    let legacy: TaskViewFiltersValue = serde_json::from_value(value)
        .map_err(|_| ApplicationError::validation("View filters 定义无效"))?;
    Ok(legacy_to_filter_query(legacy))
}

pub fn legacy_to_filter_query(legacy: TaskViewFiltersValue) -> FilterQueryValue {
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
            if !values.is_empty() {
                clauses.push(FilterClauseValue {
                    id: "migrated-priority".to_owned(),
                    field: "priority".to_owned(),
                    op: "is".to_owned(),
                    values,
                });
            }
        }
    }

    if let Some(project) = legacy.project {
        match project.mode {
            ProjectFilterMode::None => clauses.push(FilterClauseValue {
                id: "migrated-project".to_owned(),
                field: "project".to_owned(),
                op: "is".to_owned(),
                values: vec![PROJECT_NONE.to_owned()],
            }),
            ProjectFilterMode::Specific if !project.ids.is_empty() => {
                clauses.push(FilterClauseValue {
                    id: "migrated-project".to_owned(),
                    field: "project".to_owned(),
                    op: "is".to_owned(),
                    values: project.ids,
                })
            }
            _ => {}
        }
    }

    if let Some(due) = legacy.due {
        if let Some(mode) = date_mode_to_value(due.mode) {
            clauses.push(FilterClauseValue {
                id: "migrated-due".to_owned(),
                field: "due".to_owned(),
                op: "is".to_owned(),
                values: vec![mode.to_owned()],
            });
        }
    }

    if let Some(planned) = legacy.planned {
        if let Some(mode) = date_mode_to_value(planned.mode) {
            clauses.push(FilterClauseValue {
                id: "migrated-planned".to_owned(),
                field: "planned".to_owned(),
                op: "is".to_owned(),
                values: vec![mode.to_owned()],
            });
        }
    }

    FilterQueryValue { clauses }
}

/// clause → 执行期 eval（复用既有 matches / SQL 候选字段）。
pub fn filter_query_to_eval(query: &FilterQueryValue) -> TaskViewFiltersValue {
    let mut eval = TaskViewFiltersValue::default();

    for clause in &query.clauses {
        match clause.field.as_str() {
            "status" => {
                let selected = clause
                    .values
                    .iter()
                    .filter_map(|v| parse_status(v))
                    .collect::<Vec<_>>();
                if selected.is_empty() {
                    continue;
                }
                eval.status = if clause.op == "is_not" {
                    all_statuses()
                        .into_iter()
                        .filter(|s| !selected.contains(s))
                        .collect()
                } else {
                    selected
                };
            }
            "priority" => {
                let selected: Vec<i32> = clause
                    .values
                    .iter()
                    .filter_map(|v| v.parse::<i32>().ok())
                    .filter(|p| (0..=4).contains(p))
                    .collect();
                if selected.is_empty() {
                    continue;
                }
                if clause.op == "is_not" {
                    // eval 仅 eq/gte/lte；多值 is_not 用内存时 matches 只支持 eq——
                    // 降级：不设 priority 字段，完整 is_not 多值依赖后续 clause 原生 match。
                    // 单值 is_not：无法用 eq 表达，跳过（列表侧已用补集白名单）。
                    if selected.len() == 1 {
                        // 无法用 PriorityFilter 表达 is_not；留给 matches 扩展前先忽略
                        continue;
                    }
                    continue;
                }
                if selected.len() == 1 {
                    eval.priority = Some(PriorityFilter {
                        eq: Some(selected[0]),
                        gte: None,
                        lte: None,
                    });
                } else {
                    // 多值 is：取 max 作 eq 近似不够；用 gte/min lte/max 会误包含中间值。
                    // 执行期 matches 将改为同时看 FilterQuery；此处设 eq 为第一个以便 SQL 不筛错过多，
                    // 真实多值在 filter_query_matches 中收紧。
                    eval.priority = Some(PriorityFilter {
                        eq: None,
                        gte: selected.iter().copied().min(),
                        lte: selected.iter().copied().max(),
                    });
                }
            }
            "project" => {
                if clause.op != "is" {
                    continue;
                }
                if clause.values.iter().any(|v| v == PROJECT_NONE) {
                    eval.project = Some(ProjectFilter {
                        mode: ProjectFilterMode::None,
                        ids: vec![],
                    });
                } else if !clause.values.is_empty() {
                    eval.project = Some(ProjectFilter {
                        mode: ProjectFilterMode::Specific,
                        ids: clause.values.clone(),
                    });
                }
            }
            "due" => {
                if clause.op == "is" {
                    if let Some(mode) = value_to_date_mode(clause.values.first().map(String::as_str))
                    {
                        eval.due = Some(DateFilter {
                            mode,
                            from: None,
                            to: None,
                        });
                    }
                }
            }
            "planned" => {
                if clause.op == "is" {
                    if let Some(mode) = value_to_date_mode(clause.values.first().map(String::as_str))
                    {
                        eval.planned = Some(DateFilter {
                            mode,
                            from: None,
                            to: None,
                        });
                    }
                }
            }
            _ => {}
        }
    }

    eval
}

/// 覆盖合并：override 中出现的 field 整段替换 base 同 field clauses。
pub fn merge_filter_queries(base: FilterQueryValue, overrides: FilterQueryValue) -> FilterQueryValue {
    if overrides.clauses.is_empty() {
        return base;
    }
    let override_fields: std::collections::HashSet<&str> =
        overrides.clauses.iter().map(|c| c.field.as_str()).collect();
    let mut clauses: Vec<FilterClauseValue> = base
        .clauses
        .into_iter()
        .filter(|c| !override_fields.contains(c.field.as_str()))
        .collect();
    clauses.extend(overrides.clauses);
    FilterQueryValue { clauses }
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
    }
    if query.clauses.iter().any(|c| {
        c.field == "project"
            && c.op == "is"
            && !c.values.iter().any(|v| v == PROJECT_NONE)
            && c.values.is_empty()
    }) {
        return Err(ApplicationError::validation(
            "指定项目筛选必须提供 project ID",
        ));
    }
    Ok(())
}

fn date_mode_to_value(mode: DateFilterMode) -> Option<&'static str> {
    match mode {
        DateFilterMode::Today => Some("today"),
        DateFilterMode::Overdue | DateFilterMode::Past => Some("overdue"),
        DateFilterMode::Future => Some("tomorrow"), // 近似；旧 future 无 1:1
        DateFilterMode::NotNone => Some("hasDate"),
        DateFilterMode::None => Some("noDate"),
        DateFilterMode::Between => None,
    }
}

fn value_to_date_mode(value: Option<&str>) -> Option<DateFilterMode> {
    match value? {
        "today" => Some(DateFilterMode::Today),
        "overdue" => Some(DateFilterMode::Overdue),
        "hasDate" => Some(DateFilterMode::NotNone),
        "noDate" => Some(DateFilterMode::None),
        "tomorrow" | "thisWeek" => Some(DateFilterMode::Future),
        _ => None,
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

fn all_statuses() -> Vec<WorkStatus> {
    vec![
        WorkStatus::Todo,
        WorkStatus::Doing,
        WorkStatus::Waiting,
        WorkStatus::Done,
        WorkStatus::Canceled,
    ]
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
        let eval = filter_query_to_eval(&q);
        assert_eq!(eval.status.len(), 2);
    }

    #[test]
    fn merge_replaces_field() {
        let base = parse_filters_json(r#"{"clauses":[{"id":"a","field":"status","op":"is","values":["todo"]}]}"#).unwrap();
        let over = parse_filters_json(r#"{"clauses":[{"id":"b","field":"status","op":"is","values":["done"]}]}"#).unwrap();
        let merged = merge_filter_queries(base, over);
        assert_eq!(merged.clauses.len(), 1);
        assert_eq!(merged.clauses[0].values, vec!["done"]);
    }
}
