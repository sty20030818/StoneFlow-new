use stoneflow_ipc_protocol::{HelperHelloPayload, HelperShutdownReason};
use tokio::sync::{mpsc, oneshot};

use desktop_app::app::error::AppError;

#[derive(Debug)]
pub enum SupervisorCommand {
    Start {
        respond_to: oneshot::Sender<Result<(), AppError>>,
    },
    Stop {
        reason: HelperShutdownReason,
        respond_to: oneshot::Sender<Result<(), AppError>>,
    },
    HelperHello {
        payload: HelperHelloPayload,
        received_at: String,
        respond_to: oneshot::Sender<Result<(), AppError>>,
    },
    HelperWindowReady {
        at: String,
        respond_to: oneshot::Sender<Result<(), AppError>>,
    },
    HelperWindowUnready {
        at: String,
        respond_to: oneshot::Sender<Result<(), AppError>>,
    },
    ProtocolError {
        message: String,
        at: String,
        respond_to: oneshot::Sender<Result<(), AppError>>,
    },
}

#[derive(Clone)]
pub struct SupervisorHandle {
    sender: mpsc::Sender<SupervisorCommand>,
}

impl SupervisorHandle {
    pub fn new(sender: mpsc::Sender<SupervisorCommand>) -> Self {
        Self { sender }
    }

    pub async fn start(&self) -> Result<(), AppError> {
        self.round_trip(|respond_to| SupervisorCommand::Start { respond_to })
            .await
    }

    pub async fn stop(&self, reason: HelperShutdownReason) -> Result<(), AppError> {
        self.round_trip(|respond_to| SupervisorCommand::Stop { reason, respond_to })
            .await
    }

    pub async fn helper_hello(
        &self,
        payload: HelperHelloPayload,
        received_at: String,
    ) -> Result<(), AppError> {
        self.round_trip(|respond_to| SupervisorCommand::HelperHello {
            payload,
            received_at,
            respond_to,
        })
        .await
    }

    pub async fn helper_window_ready(&self, at: String) -> Result<(), AppError> {
        self.round_trip(|respond_to| SupervisorCommand::HelperWindowReady { at, respond_to })
            .await
    }

    pub async fn helper_window_unready(&self, at: String) -> Result<(), AppError> {
        self.round_trip(|respond_to| SupervisorCommand::HelperWindowUnready { at, respond_to })
            .await
    }

    pub async fn protocol_error(&self, message: String, at: String) -> Result<(), AppError> {
        self.round_trip(|respond_to| SupervisorCommand::ProtocolError {
            message,
            at,
            respond_to,
        })
        .await
    }

    async fn round_trip(
        &self,
        build: impl FnOnce(oneshot::Sender<Result<(), AppError>>) -> SupervisorCommand,
    ) -> Result<(), AppError> {
        let (tx, rx) = oneshot::channel();
        self.sender
            .send(build(tx))
            .await
            .map_err(|_| AppError::initialization("helper supervisor actor 已停止"))?;
        rx.await
            .map_err(|_| AppError::initialization("helper supervisor actor 未返回结果"))?
    }
}

