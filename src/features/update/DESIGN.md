# update 当前实现设计

## 实现边界

更新链路分为三层：

- Rust application 层的 `UpdateService` 持有进程内会话，裁决所有状态转换。
- Rust runtime 层适配 Tauri updater、设置文件、调度器、IPC 和全局事件。
- `src/features/update` 订阅快照、发起带身份的动作并呈现界面。

前端状态、IPC 返回值和事件都只是后端会话的投影。原生 updater handle、安装包字节和并发控制不会进入 renderer。

## 会话状态机

```txt
Idle
  -> Available        检查发现更新
  -> Idle             未发现更新

Available
  -> Downloading      请求身份与候选身份一致
  -> Idle             跳过候选，或切换渠道

Downloading
  -> Ready            下载和校验完成
  -> Available         取消或失败，且候选渠道仍有效
  -> Idle              取消或失败，但下载期间已切换渠道

Ready
  -> Installing       版本匹配，必要的来源渠道确认通过

Installing
  -> Ready            标记写入、安装或重启失败，保留同一 staged update
  -> 进程退出          平台安装和重启开始
```

错误不是独立阶段。错误文本附着在转换后的快照上，因此下载失败可以留在 `Available`，安装失败可以留在 `Ready`。前端据此提供原动作重试，不重新检查远端，也不重新下载仍然有效的安装包。

## 检查与渠道

手动检查绕过自动检查间隔和跳过版本过滤。启动检查不受间隔限制，但尊重手动模式和跳过版本；后续定时检查同时尊重模式、间隔和跳过版本。

检查开始时记录请求渠道和 operation epoch。网络返回后，服务在设置写入锁内重读最新设置。渠道已变化或 epoch 已失效时，返回结果不能写入会话，也不能用旧设置覆盖新设置。

检查返回显式 `Found / NoUpdate / Skipped / Superseded`。只有远端检查真实完成且没有候选的 `NoUpdate` 能触发“当前已是最新版本”；模式、节流、活动事务、跳过版本和并发失效都不能由 IPC 反推为无更新。

Stable 渠道只接受更高的正式版本。Beta 渠道使用自己的远端指针。本平台的指针不存在时按无更新处理，这使 macOS 和 Windows 可以在同一全局版本序列上独立推进各自可用版本。

自动下载模式只在检查发现更新后开始下载。下载完成后仍停在 `Ready`，不会自动安装或重启。

## 精确更新身份

一次有效检查产生不可变的 `CheckedUpdate`，其中包含版本、渠道和 Tauri updater 返回的原生 opaque handle。后续下载必须复用该 handle，禁止再次检查远端指针。

下载完成后，服务把同一 `CheckedUpdate` 与已验证字节组合为 `StagedUpdate`。`Ready` 与 `Installing` 共享同一个 staged 对象：

- 下载请求必须同时匹配版本和渠道。
- 安装请求必须匹配 staged 版本。
- 当前设置渠道与 staged 来源渠道不同时，调用方必须精确确认 staged 渠道。
- 身份不一致返回可判别的 conflict，并携带当前权威快照，不触发网络、安装器或重启。

远端指针在下载后改变或消失，不影响已暂存更新的安装。

## 并发、取消与 revision

会话 mutex 保护状态和 staged 对象，operation epoch 隔离异步操作轮次：

- 相同身份的重复下载共享既有进行态，不启动第二个网络任务。
- 不同身份的并发下载直接冲突。
- 跳过版本只接受精确匹配的 `Available` 身份，并与开始下载原子竞争；设置保存失败恢复同一候选。
- 检查请求在 application 层串行，手动检查不会被后到的定时检查废弃并误报“已是最新版本”。
- 下载运行在独立任务中，取消会 abort 底层任务。
- 下载 future 被上层取消时，guard 负责恢复候选并中断任务。
- 晚到的 abort handle、进度回调和下载结果只有 epoch 仍匹配时才能提交。
- 安装进入 `Installing` 后，任何重复安装请求都返回携带权威快照的冲突，不再调用 installer。

每次可观察变化都会推进单进程 revision，包括阶段、进度和错误变化。runtime 只发布 `update-session-changed`；前端先订阅事件再 hydrate，并且只接受更高 revision，消除“旧读取覆盖新事件”的竞态。首次订阅失败时仍会 hydrate 当前会话并执行可取消重试，成功订阅后再次 hydrate 关闭失败窗口。NotifyOnly 自动弹窗受 snapshot revision 约束：用户关闭某一 revision 后，迟到的设置读取不能把它重新打开。

设置另有异步 mutex，只串行化 load-modify-save。网络下载和安装不会长期占用设置锁，安装前的渠道校验与完成标记写入除外。

## 设置持久化

更新设置由 runtime 独占写入应用数据目录的 `update-settings.json`。renderer 不直接读写该文件；应用不再注册 `tauri-plugin-store`，也不授予 `store:*` capability。导航、侧栏和展示选项等可重置的 renderer 偏好使用独立的 namespaced `localStorage` key，不与更新事务共用持久化边界。

保存时在同一目录创建临时文件，写入完整 JSON，执行文件同步，再原子替换目标文件。文件不存在时使用默认设置；读取失败或 JSON 无效时返回错误，不静默覆盖损坏内容。检查间隔在读取和保存边界统一规范化。当前实现没有同步父目录，因此不把突然断电后的目录项持久性当作已保证能力。

所有设置修改都经过同一写入锁，避免渠道、检查模式、间隔、跳过版本和重启标记之间发生丢失更新。

## 安装与失败恢复

安装开始前必须先把目标版本写入 `pendingRestartVersion`。标记写入失败时不会调用平台安装器，会恢复同一 staged update 到 `Ready`。

平台行为由 Tauri updater 决定：

- Windows 安装会启动系统安装器并退出当前进程，后续重启由安装器接管。
- macOS 和其他 Unix 平台安装返回后，由应用调用 restart。

安装或重启失败时，服务先尝试清除完成标记，再把同一 staged 对象恢复为 `Ready` 并附上错误。清理标记也失败时，错误会同时包含主失败与清理失败，staged update 仍保留供重试。

新进程启动后以当前应用版本消费完成标记。标记只消费一次，且只有版本精确匹配时才显示更新成功；版本不匹配时同样清除标记，但不显示成功提示。

## 前端交互约束

- 手动检查的 pending 和“当前已是最新版本”只是本次交互结果，不进入后端状态机。
- 跳过版本必须携带当前版本和渠道；只有后端返回成功快照后才关闭对话框，冲突或保存失败保留权威状态并提示。
- `Ready` 打开对话框后才读取当前配置渠道。读取完成前或读取失败时禁止安装。
- 跨渠道安装提示同时展示当前配置渠道、staged 来源渠道和版本，并把来源渠道作为明确确认提交。
- `Installing` 对用户可见，期间禁止关闭弹窗和触发其它更新操作。
- 安装失败回到 `Ready` 后，重试按钮直接安装同一 staged update。
- 更新说明通过 changelog 的 `(currentVersion, targetVersion]` 区间查询展示；没有可展示条目不影响更新动作。

## 相关实现

- 后端状态机：`src-tauri/crates/application/src/update.rs`
- Tauri adapter：`src-tauri/crates/runtime/src/update/adapter.rs`
- IPC 与事件：`src-tauri/crates/runtime/src/commands/update.rs`、`src-tauri/crates/runtime/src/update/events.rs`
- 设置持久化：`src-tauri/crates/runtime/src/update/settings_store.rs`
- 前端快照投影：`model/useUpdateStore.ts`
