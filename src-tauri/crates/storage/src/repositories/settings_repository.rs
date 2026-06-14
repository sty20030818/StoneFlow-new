//! Settings Repository：只负责 Settings JSON 持久化入口。

use sea_orm::{
    ActiveModelTrait, ConnectionTrait, DatabaseConnection, EntityTrait, IntoActiveModel, Set,
};
use serde::{de::DeserializeOwned, Serialize};
use stoneflow_schema::{prelude::Setting, setting};

#[derive(Debug, Clone)]
pub struct SettingsRepository {
    db: DatabaseConnection,
}

impl SettingsRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    /// 按 key 查找原始 JSON 字符串；不存在时返回 None。
    pub async fn find_raw_setting(
        &self,
        key: &str,
    ) -> Result<Option<String>, crate::error::StorageError> {
        let model = Setting::find_by_id(key.to_owned())
            .one(self.connection())
            .await?;

        Ok(model.map(|item| item.value))
    }

    /// 读取原始 JSON 字符串。
    pub async fn get_raw_setting(&self, key: &str) -> Result<String, crate::error::StorageError> {
        self.find_raw_setting(key).await?.ok_or_else(|| {
            crate::error::StorageError::not_found(format!("setting `{key}` 不存在"))
        })
    }

    /// 读取并反序列化 JSON setting。
    pub async fn get_json_setting<T>(&self, key: &str) -> Result<T, crate::error::StorageError>
    where
        T: DeserializeOwned,
    {
        let raw = self.get_raw_setting(key).await?;
        deserialize_setting(key, &raw)
    }

    /// 读取并反序列化 JSON setting；不存在时返回 None。
    pub async fn find_json_setting<T>(
        &self,
        key: &str,
    ) -> Result<Option<T>, crate::error::StorageError>
    where
        T: DeserializeOwned,
    {
        let Some(raw) = self.find_raw_setting(key).await? else {
            return Ok(None);
        };

        deserialize_setting(key, &raw).map(Some)
    }

    /// 直接在主连接上写回 JSON setting。
    pub async fn set_json_setting<T>(
        &self,
        key: &str,
        value: &T,
        updated_at: &str,
    ) -> Result<(), crate::error::StorageError>
    where
        T: Serialize,
    {
        self.set_json_setting_in_connection(self.connection(), key, value, updated_at)
            .await
    }

    /// 在指定连接或事务内写回 JSON setting。
    pub async fn set_json_setting_in_connection<C, T>(
        &self,
        connection: &C,
        key: &str,
        value: &T,
        updated_at: &str,
    ) -> Result<(), crate::error::StorageError>
    where
        C: ConnectionTrait,
        T: Serialize,
    {
        let raw = serde_json::to_string(value).map_err(|error| {
            crate::error::StorageError::database(format!("setting `{key}` 序列化失败: {error}"))
        })?;
        self.set_raw_setting_in_connection(connection, key, &raw, updated_at)
            .await
    }

    pub async fn set_raw_setting_in_connection<C>(
        &self,
        connection: &C,
        key: &str,
        raw_value: &str,
        updated_at: &str,
    ) -> Result<(), crate::error::StorageError>
    where
        C: ConnectionTrait,
    {
        let model = Setting::find_by_id(key.to_owned())
            .one(connection)
            .await?
            .ok_or_else(|| {
                crate::error::StorageError::not_found(format!("setting `{key}` 不存在"))
            })?;

        let mut active_model: setting::ActiveModel = model.into_active_model();
        active_model.value = Set(raw_value.to_owned());
        active_model.updated_at = Set(updated_at.to_owned());
        active_model.update(connection).await?;

        Ok(())
    }
}

fn deserialize_setting<T>(key: &str, raw: &str) -> Result<T, crate::error::StorageError>
where
    T: DeserializeOwned,
{
    serde_json::from_str(raw).map_err(|error| {
        crate::error::StorageError::database(format!("setting `{key}` 反序列化失败: {error}"))
    })
}
