//! 工作项优先级（存储为 INTEGER 0..=4；领域层始终用枚举）。

use serde::{Deserialize, Serialize};

use crate::DomainError;

/// 工作项优先级（Task 与 Project 共用）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkPriority {
    None,
    Low,
    Medium,
    High,
    Urgent,
}

impl WorkPriority {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Urgent => "urgent",
        }
    }

    /// 持久化用的稳定整数（0..=4）。
    pub fn as_i32(self) -> i32 {
        match self {
            Self::None => 0,
            Self::Low => 1,
            Self::Medium => 2,
            Self::High => 3,
            Self::Urgent => 4,
        }
    }

    pub fn from_i32(value: i32) -> Result<Self, DomainError> {
        match value {
            0 => Ok(Self::None),
            1 => Ok(Self::Low),
            2 => Ok(Self::Medium),
            3 => Ok(Self::High),
            4 => Ok(Self::Urgent),
            other => Err(DomainError::validation(format!(
                "Work priority 必须在 0 到 4 之间，收到 {other}"
            ))),
        }
    }

    pub fn parse(raw: &str) -> Result<Self, DomainError> {
        match raw.trim() {
            "none" => Ok(Self::None),
            "low" => Ok(Self::Low),
            "medium" => Ok(Self::Medium),
            "high" => Ok(Self::High),
            "urgent" => Ok(Self::Urgent),
            other => Err(DomainError::validation(format!(
                "不支持的工作优先级: {other}"
            ))),
        }
    }
}
