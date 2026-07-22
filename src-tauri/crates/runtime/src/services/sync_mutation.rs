use serde::Serialize;
use stoneflow_storage::repositories::SyncMutationRecord;

use crate::app::error::AppError;

pub fn build_upsert_record<T>(
    entity_type: &str,
    entity_id: &str,
    payload: &T,
    updated_at: &str,
) -> Result<SyncMutationRecord, AppError>
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
) -> Result<SyncMutationRecord, AppError>
where
    T: Serialize,
{
    build_record(entity_type, entity_id, "soft_delete", payload, updated_at)
}

pub fn build_hard_delete_record<T>(
    entity_type: &str,
    entity_id: &str,
    payload: &T,
    updated_at: &str,
) -> Result<SyncMutationRecord, AppError>
where
    T: Serialize,
{
    build_record(entity_type, entity_id, "hard_delete", payload, updated_at)
}

fn build_record<T>(
    entity_type: &str,
    entity_id: &str,
    operation: &str,
    payload: &T,
    updated_at: &str,
) -> Result<SyncMutationRecord, AppError>
where
    T: Serialize,
{
    let payload = serde_json::to_string(payload).map_err(|error| {
        AppError::internal(format!("序列化 {entity_type} sync payload 失败: {error}"))
    })?;

    Ok(SyncMutationRecord {
        client_id: String::new(),
        client_seq: 0,
        entity_type: entity_type.to_owned(),
        entity_id: entity_id.to_owned(),
        operation: operation.to_owned(),
        payload,
        base_server_seq: None,
        status: "pending".to_owned(),
        error_message: None,
        created_at: updated_at.to_owned(),
        updated_at: updated_at.to_owned(),
    })
}
