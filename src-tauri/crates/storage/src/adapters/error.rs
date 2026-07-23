//! application 错误映射（storage 边界）。

use stoneflow_application::ApplicationError;

pub(crate) fn from_db(error: sea_orm::DbErr) -> ApplicationError {
    ApplicationError::storage(error.to_string())
}

pub(crate) fn from_storage(error: crate::StorageError) -> ApplicationError {
    ApplicationError::storage(error.to_string())
}

pub(crate) fn from_display(error: impl std::fmt::Display) -> ApplicationError {
    ApplicationError::storage(error.to_string())
}
