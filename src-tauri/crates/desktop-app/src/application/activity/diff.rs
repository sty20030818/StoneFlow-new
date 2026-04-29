//! Activity Diff：只负责比较显式白名单字段。

use serde::Serialize;
use serde_json::Value;

use crate::app::error::AppError;
use crate::domain::normalize_required_text;

use super::ActivityChangeInput;

/// 比较两个实体在指定字段上的变化，输出稳定的 Activity change 列表。
pub fn create_changes<T>(
    old_entity: &T,
    new_entity: &T,
    fields: &[&str],
) -> Result<Vec<ActivityChangeInput>, AppError>
where
    T: Serialize,
{
    let old_value = serde_json::to_value(old_entity)
        .map_err(|error| AppError::internal(format!("旧实体序列化失败: {error}")))?;
    let new_value = serde_json::to_value(new_entity)
        .map_err(|error| AppError::internal(format!("新实体序列化失败: {error}")))?;

    create_changes_from_values(&old_value, &new_value, fields)
}

fn create_changes_from_values(
    old_entity: &Value,
    new_entity: &Value,
    fields: &[&str],
) -> Result<Vec<ActivityChangeInput>, AppError> {
    let mut changes = Vec::new();

    for field in fields {
        let normalized_field = normalize_required_text(field, "Activity 变更字段")?;
        if normalized_field == "updated_at" {
            continue;
        }

        let old_value = extract_field_value(old_entity, &normalized_field);
        let new_value = extract_field_value(new_entity, &normalized_field);

        let old_serialized = serialize_value_for_compare(&old_value)?;
        let new_serialized = serialize_value_for_compare(&new_value)?;

        if old_serialized == new_serialized {
            continue;
        }

        changes.push(ActivityChangeInput {
            field: normalized_field,
            old_value,
            new_value,
        });
    }

    Ok(changes)
}

fn extract_field_value(entity: &Value, field: &str) -> Option<Value> {
    match entity {
        Value::Object(map) => map.get(field).cloned(),
        _ => None,
    }
}

fn serialize_value_for_compare(value: &Option<Value>) -> Result<String, AppError> {
    serde_json::to_string(value)
        .map_err(|error| AppError::internal(format!("Activity 变更值序列化失败: {error}")))
}

#[cfg(test)]
mod tests {
    use serde::Serialize;
    use serde_json::json;

    use super::create_changes;

    #[derive(Debug, Serialize)]
    struct ActivityProbe {
        title: String,
        status: String,
        status_changed_at: String,
        updated_at: String,
        metadata: serde_json::Value,
        optional_note: Option<String>,
    }

    #[test]
    fn create_changes_should_ignore_updated_at_and_keep_real_field_changes() {
        let old_entity = ActivityProbe {
            title: "旧标题".to_owned(),
            status: "todo".to_owned(),
            status_changed_at: "2026-04-29T00:00:00Z".to_owned(),
            updated_at: "2026-04-29T00:00:00Z".to_owned(),
            metadata: json!({ "priority": 1 }),
            optional_note: None,
        };
        let new_entity = ActivityProbe {
            title: "新标题".to_owned(),
            status: "doing".to_owned(),
            status_changed_at: "2026-04-29T01:00:00Z".to_owned(),
            updated_at: "2026-04-29T02:00:00Z".to_owned(),
            metadata: json!({ "priority": 2 }),
            optional_note: Some("已补充说明".to_owned()),
        };

        let changes = create_changes(
            &old_entity,
            &new_entity,
            &[
                "title",
                "status",
                "status_changed_at",
                "updated_at",
                "metadata",
                "optional_note",
            ],
        )
        .expect("diff should succeed");

        let fields = changes
            .iter()
            .map(|change| change.field.as_str())
            .collect::<Vec<_>>();

        assert_eq!(
            fields,
            vec![
                "title",
                "status",
                "status_changed_at",
                "metadata",
                "optional_note"
            ]
        );
    }

    #[test]
    fn create_changes_should_skip_unchanged_fields() {
        let old_entity = ActivityProbe {
            title: "标题".to_owned(),
            status: "todo".to_owned(),
            status_changed_at: "2026-04-29T00:00:00Z".to_owned(),
            updated_at: "2026-04-29T00:00:00Z".to_owned(),
            metadata: json!({ "priority": 1 }),
            optional_note: None,
        };
        let new_entity = ActivityProbe {
            title: "标题".to_owned(),
            status: "todo".to_owned(),
            status_changed_at: "2026-04-29T00:00:00Z".to_owned(),
            updated_at: "2026-04-29T01:00:00Z".to_owned(),
            metadata: json!({ "priority": 1 }),
            optional_note: None,
        };

        let changes = create_changes(
            &old_entity,
            &new_entity,
            &["title", "status", "updated_at", "metadata"],
        )
        .expect("diff should succeed");

        assert!(changes.is_empty());
    }
}
