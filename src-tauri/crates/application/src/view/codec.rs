//! Saved View 的持久化定义与同步字段共用一个编码边界。

use std::collections::BTreeMap;

use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Map, Value};
use stoneflow_domain::{validate_project_id, ViewEntityKind};

use crate::{
    view::{
        filter_query::{parse_filters_json, validate_filter_query},
        FilterQueryValue, TaskScopeInput, TaskScopeKind, TaskViewBaseKey, TaskViewContext,
        ViewRecord,
    },
    ApplicationError,
};

pub const EMPTY_SORT_JSON: &str = "[]";
pub const NO_GROUP_JSON: &str = "\"none\"";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct StoredTaskViewDefinition {
    pub base_view_key: TaskViewBaseKey,
    pub context: TaskViewContext,
    pub filters: FilterQueryValue,
}

/// 协议保留既有字段形状；已退出业务的 sort/group 不参与定义校验。
pub fn view_sync_fields(record: &ViewRecord) -> Result<Map<String, Value>, ApplicationError> {
    let (scope, definition) = decode_record_definition(record)?;
    protocol_fields(record, json!(scope), json!(definition))
}

/// 冷协议与 origin seed 保留不可用定义，让后续补丁及按 ID 删除仍可同步。
/// 本地非法 JSON 文本保存为 JSON String；它仍是坏定义，不尝试解释成合法查询。
pub fn view_sync_fields_preserving_definition(
    record: &ViewRecord,
) -> Result<Map<String, Value>, ApplicationError> {
    match decode_record_definition(record) {
        Ok((scope, definition)) => protocol_fields(record, json!(scope), json!(definition)),
        Err(_) => protocol_fields(
            record,
            serde_json::from_str(&record.scope_json)
                .unwrap_or_else(|_| Value::String(record.scope_json.clone())),
            serde_json::from_str(&record.filters_json)
                .unwrap_or_else(|_| Value::String(record.filters_json.clone())),
        ),
    }
}

fn protocol_fields(
    record: &ViewRecord,
    scope: Value,
    definition: Value,
) -> Result<Map<String, Value>, ApplicationError> {
    validate_record_metadata(record)?;
    Ok(Map::from_iter([
        ("name".to_owned(), json!(record.name)),
        ("entity_kind".to_owned(), json!(record.entity_kind)),
        ("scope".to_owned(), scope),
        ("filters".to_owned(), definition),
        ("sort".to_owned(), json!([])),
        ("group_by".to_owned(), json!("none")),
        ("position".to_owned(), json!(record.position)),
        ("created_at".to_owned(), json!(record.created_at)),
        ("updated_at".to_owned(), json!(record.updated_at)),
    ]))
}

/// 物化可清理的完整记录；坏定义原样保留，残缺 patch 必须先由协议层补齐。
pub fn view_record_from_sync_fields(
    id: &str,
    generation: i64,
    fields: &BTreeMap<String, Value>,
) -> Result<ViewRecord, ApplicationError> {
    let mut record = ViewRecord {
        id: id.to_owned(),
        name: required_sync_field(fields, "name")?,
        entity_kind: required_sync_field(fields, "entity_kind")?,
        scope_json: to_json(&required_sync_field::<Value>(fields, "scope")?)?,
        filters_json: to_json(&required_sync_field::<Value>(fields, "filters")?)?,
        sort_json: EMPTY_SORT_JSON.to_owned(),
        group_by_json: Some(NO_GROUP_JSON.to_owned()),
        position: required_sync_field(fields, "position")?,
        generation,
        created_at: required_sync_field(fields, "created_at")?,
        updated_at: required_sync_field(fields, "updated_at")?,
    };
    validate_record_metadata(&record)?;
    if let Ok((scope, definition)) = decode_record_definition(&record) {
        record.scope_json = to_json(&scope)?;
        record.filters_json = to_json(&definition)?;
    }
    Ok(record)
}

fn validate_record_metadata(record: &ViewRecord) -> Result<(), ApplicationError> {
    if record.entity_kind != ViewEntityKind::Task {
        return Err(ApplicationError::validation("仅支持 Task View"));
    }
    for (field, value) in [
        ("id", &record.id),
        ("name", &record.name),
        ("created_at", &record.created_at),
        ("updated_at", &record.updated_at),
    ] {
        if value.trim().is_empty() {
            return Err(ApplicationError::validation(format!(
                "View 同步字段 {field} 无效"
            )));
        }
    }
    // 每条保留记录都必须还能推进代际发送 tombstone。
    if record.generation < 1 || record.generation == i64::MAX || record.position < 0 {
        return Err(ApplicationError::validation("View 同步元数据无效"));
    }
    Ok(())
}

fn required_sync_field<T: DeserializeOwned>(
    fields: &BTreeMap<String, Value>,
    key: &str,
) -> Result<T, ApplicationError> {
    let value = fields
        .get(key)
        .ok_or_else(|| ApplicationError::validation(format!("View 缺少同步字段 {key}")))?;
    serde_json::from_value(value.clone())
        .map_err(|_| ApplicationError::validation(format!("View 同步字段 {key} 无效")))
}

pub(super) fn decode_record_definition(
    record: &ViewRecord,
) -> Result<(TaskScopeInput, StoredTaskViewDefinition), ApplicationError> {
    if record.entity_kind != ViewEntityKind::Task {
        return Err(ApplicationError::validation("仅支持 Task View"));
    }
    let scope = from_json(&record.scope_json)?;
    let definition = decode_stored_definition(&record.filters_json)?;
    validate_definition(&scope, &definition.context, &definition.filters)?;
    Ok((scope, definition))
}

pub(super) fn validate_definition(
    scope: &TaskScopeInput,
    context: &TaskViewContext,
    filters: &FilterQueryValue,
) -> Result<(), ApplicationError> {
    validate_scope(scope)?;
    if let TaskViewContext::Project { project_id } = context {
        validate_project_id(project_id)?;
    }
    validate_filter_query(filters)?;
    Ok(())
}

pub(super) fn validate_scope(scope: &TaskScopeInput) -> Result<(), ApplicationError> {
    if matches!(scope.kind, TaskScopeKind::Space)
        && scope.space_id.as_deref().is_none_or(str::is_empty)
    {
        return Err(ApplicationError::validation("Space 范围必须提供 spaceId"));
    }
    if matches!(scope.kind, TaskScopeKind::All) && scope.space_id.is_some() {
        return Err(ApplicationError::validation(
            "全部 Space 范围不能提供 spaceId",
        ));
    }
    Ok(())
}

pub(super) fn decode_stored_definition(
    value: &str,
) -> Result<StoredTaskViewDefinition, ApplicationError> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed == "null" {
        return Ok(StoredTaskViewDefinition {
            base_view_key: TaskViewBaseKey::All,
            context: TaskViewContext::All,
            filters: FilterQueryValue::default(),
        });
    }
    let json: Value = serde_json::from_str(trimmed)
        .map_err(|_| ApplicationError::validation("View filters 定义无效"))?;
    let is_definition = json.as_object().is_some_and(|object| {
        object.contains_key("baseViewKey")
            || object.contains_key("context")
            || object.contains_key("filters")
    });
    if is_definition {
        return serde_json::from_value(json)
            .map_err(|_| ApplicationError::validation("Saved View 定义无效"));
    }

    // 唯一兼容边界：旧 filters_json 仍按原筛选形状读取，随后进入新定义。
    Ok(StoredTaskViewDefinition {
        base_view_key: TaskViewBaseKey::All,
        context: TaskViewContext::All,
        filters: parse_filters_json(value)?,
    })
}

pub(super) fn to_json<T: Serialize>(value: &T) -> Result<String, ApplicationError> {
    serde_json::to_string(value)
        .map_err(|error| ApplicationError::validation(format!("View 定义序列化失败: {error}")))
}

pub(super) fn from_json<T: DeserializeOwned>(value: &str) -> Result<T, ApplicationError> {
    serde_json::from_str(value).map_err(|_| ApplicationError::validation("View 定义无效"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record() -> ViewRecord {
        ViewRecord {
            id: "view-1".to_owned(),
            name: "待执行".to_owned(),
            entity_kind: ViewEntityKind::Task,
            scope_json: r#"{"type":"all","spaceId":null}"#.to_owned(),
            filters_json: r#"{"baseViewKey":"active","context":{"kind":"standalone"},"filters":{"clauses":[{"id":"status-1","field":"status","op":"is","values":["todo"]}]}}"#.to_owned(),
            sort_json: EMPTY_SORT_JSON.to_owned(),
            group_by_json: Some(NO_GROUP_JSON.to_owned()),
            position: 1024,
            generation: 3,
            created_at: "2026-08-22T00:00:00Z".to_owned(),
            updated_at: "2026-08-23T00:00:00Z".to_owned(),
        }
    }

    #[test]
    fn protocol_round_trip_preserves_definition_identity_and_metadata() {
        let original = record();
        let fields = view_sync_fields(&original).unwrap().into_iter().collect();
        let restored =
            view_record_from_sync_fields(&original.id, original.generation, &fields).unwrap();

        assert_eq!(restored, original);
        assert_eq!(restored.group_by_json.as_deref(), Some(r#""none""#));
    }

    #[test]
    fn obsolete_display_columns_do_not_block_current_definition() {
        for group_by_json in [None, Some("none"), Some(r#""none""#), Some("unknown")] {
            let mut original = record();
            original.sort_json = "obsolete-sort".to_owned();
            original.group_by_json = group_by_json.map(str::to_owned);

            let fields = view_sync_fields(&original).unwrap();
            assert_eq!(fields["sort"], json!([]));
            assert_eq!(fields["group_by"], json!("none"));
            let restored = view_record_from_sync_fields(
                &original.id,
                original.generation,
                &fields.into_iter().collect(),
            )
            .unwrap();
            assert_eq!(restored.sort_json, EMPTY_SORT_JSON);
            assert_eq!(restored.group_by_json.as_deref(), Some(NO_GROUP_JSON));
            assert_eq!(restored.filters_json, original.filters_json);
        }
    }

    #[test]
    fn downloaded_obsolete_fields_are_canonical_json_text() {
        let original = record();
        let mut fields: BTreeMap<_, _> = view_sync_fields(&original).unwrap().into_iter().collect();
        for group in [
            Value::Null,
            json!("none"),
            json!(r#""none""#),
            json!({"old": true}),
        ] {
            fields.insert("group_by".to_owned(), group);
            fields.insert("sort".to_owned(), json!("obsolete-sort"));
            let restored = view_record_from_sync_fields("view-1", 3, &fields).unwrap();
            assert_eq!(restored.sort_json, EMPTY_SORT_JSON);
            assert_eq!(restored.group_by_json.as_deref(), Some(NO_GROUP_JSON));
        }
    }

    #[test]
    fn damaged_or_missing_business_definition_is_never_replaced_with_empty_filters() {
        let original = record();
        for invalid in [
            json!({"baseViewKey":"all","filters":{"clauses":[]}}),
            json!({"baseViewKey":"all","context":{"kind":"all"},"filters":{"clauses":[{"field":"status","op":"is","values":["unknown"]}]}}),
            json!({"unknown":true}),
        ] {
            let mut damaged = original.clone();
            damaged.filters_json = invalid.to_string();
            assert!(view_sync_fields(&damaged).is_err());
            let mut fields: BTreeMap<_, _> =
                view_sync_fields(&original).unwrap().into_iter().collect();
            fields.insert("filters".to_owned(), invalid);
            let restored = view_record_from_sync_fields("view-1", 3, &fields).unwrap();
            assert_eq!(
                serde_json::from_str::<Value>(&restored.filters_json).unwrap(),
                fields["filters"]
            );
            assert!(view_sync_fields(&restored).is_err());
        }
        for missing in [
            "name",
            "entity_kind",
            "scope",
            "filters",
            "position",
            "created_at",
            "updated_at",
        ] {
            let mut fields: BTreeMap<_, _> =
                view_sync_fields(&original).unwrap().into_iter().collect();
            fields.remove(missing);
            assert!(
                view_record_from_sync_fields("view-1", 3, &fields).is_err(),
                "{missing}"
            );
        }
        let mut damaged = original;
        damaged.scope_json = r#"{"type":"space"}"#.to_owned();
        assert!(view_sync_fields(&damaged).is_err());
    }

    #[test]
    fn protocol_preserves_unavailable_definitions_without_making_them_executable() {
        for scope in [r#"{"type":"unknown"}"#, "broken-json"] {
            let mut original = record();
            original.scope_json = scope.to_owned();
            original.filters_json = r#"{"unrecognized":true}"#.to_owned();
            let fields = view_sync_fields_preserving_definition(&original).unwrap();
            let restored = view_record_from_sync_fields(
                &original.id,
                original.generation,
                &fields.clone().into_iter().collect(),
            )
            .unwrap();
            assert_eq!(restored.id, original.id);
            assert_eq!(restored.name, original.name);
            assert_eq!(
                view_sync_fields_preserving_definition(&restored).unwrap(),
                fields
            );
            assert!(decode_record_definition(&restored).is_err());
        }
    }

    #[test]
    fn protocol_rejects_records_without_recoverable_identity_or_deletion_generation() {
        let original = record();
        let fields = view_sync_fields(&original).unwrap().into_iter().collect();
        for (id, generation) in [("", 1), ("view-1", 0), ("view-1", i64::MAX)] {
            assert!(view_record_from_sync_fields(id, generation, &fields).is_err());
        }
    }
}
