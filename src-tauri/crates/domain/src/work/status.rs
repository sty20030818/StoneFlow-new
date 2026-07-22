//! 工作项状态（存储为 TEXT：todo/doing/waiting/done/canceled）。

use serde::{Deserialize, Serialize};

use crate::DomainError;

/// 工作项状态（Task 与 Project 共用）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkStatus {
    Todo,
    Doing,
    Waiting,
    Done,
    Canceled,
}

impl WorkStatus {
    /// 持久化 / 协议用的稳定字符串。
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Todo => "todo",
            Self::Doing => "doing",
            Self::Waiting => "waiting",
            Self::Done => "done",
            Self::Canceled => "canceled",
        }
    }

    pub fn parse(raw: &str) -> Result<Self, DomainError> {
        match raw.trim() {
            "todo" => Ok(Self::Todo),
            "doing" => Ok(Self::Doing),
            "waiting" => Ok(Self::Waiting),
            "done" => Ok(Self::Done),
            "canceled" => Ok(Self::Canceled),
            other => Err(DomainError::validation(format!(
                "不支持的工作状态: {other}"
            ))),
        }
    }

    pub fn is_done(self) -> bool {
        matches!(self, Self::Done)
    }

    pub fn is_canceled(self) -> bool {
        matches!(self, Self::Canceled)
    }
}
