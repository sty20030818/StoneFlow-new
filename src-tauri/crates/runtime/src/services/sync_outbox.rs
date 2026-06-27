use serde::Serialize;
use stoneflow_domain::create_id;
use stoneflow_storage::repositories::SyncOutboxRecord;

use crate::app::error::AppError;

pub fn build_upsert_record<T>(
    entity_type: &str,
    entity_id: &str,
    payload: &T,
    updated_at: &str,
) -> Result<SyncOutboxRecord, AppError>
where
    T: Serialize,
{
    build_record(entity_type, entity_id, "upsert", payload, updated_at)
}

pub fn build_delete_record<T>(
    entity_type: &str,
    entity_id: &str,
    payload: &T,
    updated_at: &str,
) -> Result<SyncOutboxRecord, AppError>
where
    T: Serialize,
{
    build_record(entity_type, entity_id, "delete", payload, updated_at)
}

fn build_record<T>(
    entity_type: &str,
    entity_id: &str,
    action: &str,
    payload: &T,
    updated_at: &str,
) -> Result<SyncOutboxRecord, AppError>
where
    T: Serialize,
{
    let payload = serde_json::to_string(payload).map_err(|error| {
        AppError::internal(format!(
            "序列化 {entity_type} sync payload 失败: {error}"
        ))
    })?;

    Ok(SyncOutboxRecord {
        id: create_id().to_string(),
        entity_type: entity_type.to_owned(),
        entity_id: entity_id.to_owned(),
        action: action.to_owned(),
        payload,
        status: "pending".to_owned(),
        error_message: None,
        attempt_count: 0,
        created_at: updated_at.to_owned(),
        updated_at: updated_at.to_owned(),
    })
}
