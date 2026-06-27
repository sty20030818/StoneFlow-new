//! Quick Create Session Bridge：提供 prepare-session 所需的只读桥接入口。

use stoneflow_usecase::quick_create_context::QuickInitialStateDto;

use crate::{
    app::{error::AppError, state::ActiveScopeSnapshot},
    services::QuickCreateOpenContextService,
};

#[derive(Debug, Clone)]
pub struct QuickCreateSessionBridge {
    open_context_service: QuickCreateOpenContextService,
}

impl QuickCreateSessionBridge {
    pub fn new(open_context_service: QuickCreateOpenContextService) -> Self {
        Self {
            open_context_service,
        }
    }

    pub async fn prepare_initial_state(
        &self,
        active_scope: Option<ActiveScopeSnapshot>,
    ) -> Result<QuickInitialStateDto, AppError> {
        self.open_context_service
            .get_initial_state(active_scope)
            .await
    }
}
