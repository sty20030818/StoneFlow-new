//! 主 App 本地 IPC 入口：承接来自 Helper 进程的 Quick Capture 请求。
//!
//! 设计要点：
//! - 传输基于 [`interprocess`] 的 `local_socket`，Unix 下使用文件域套接字，Windows 下使用命名管道；
//! - 帧格式为 `u32 BE` 长度 + JSON 字节，与 [`stoneflow_ipc_protocol`] 的约束对齐；
//! - 处理器直接调用主 App 现有的 `application::create` 用例，Helper 不拥有数据库权。

pub(crate) mod server;

pub(crate) use server::start_ipc_server;
