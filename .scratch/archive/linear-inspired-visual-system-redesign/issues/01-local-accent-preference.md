# 01 — 贯通本机 Accent 选择

**What to build:** 用户可以在“通用”设置中从六个精选主题色中选择 Accent；选择立即应用到主窗口、在本机重启后恢复，并在 Launcher 每次呈现时保持一致，同时不改变中性色或领域状态色。

**Blocked by:** None — can start immediately

**Status:** completed; archived

- [x] “通用”设置展示钴蓝、海洋蓝、烟紫、松柏、梅紫和石墨六个带名称与色样的选项，默认选择钴蓝。
- [x] 六个稳定标识与方向锚点固定为：`cobalt` `#6E78D5`（Hover 参考 `#5F6AC1`）、`ocean` `#176987`、`violet` `#72509A`、`pine` `#236A61`、`plum` `#864A75`、`graphite` `#4C5966`；锚点不被直接复用为全部状态值。
- [x] 选择器使用可访问的单选集合语义，支持键盘方向键，并清楚区分选中态与 Focus-visible。
- [x] 用户选择后，当前主窗口立即应用对应的根级 Accent 状态，仅保存稳定预设标识到本机偏好，不写入数据库、Rust 设置、账户或同步协议。
- [x] 本机存储不可用时沿用现有 Web Storage 合同的当前会话回退，不为视觉偏好新增第二套持久化机制。
- [x] Main 与 Launcher 在 React 挂载前使用同一解析与应用合同；Launcher 启动及每次呈现前重新读取当前本机选择，不新增跨窗口同步通道。
- [x] 缺失、损坏或未知的偏好值统一回退钴蓝，下一次合法选择能够自然覆盖异常值。
- [x] 六个预设只改变登记过的 Accent 语义；冷灰中性色以及 Info、Success、Warning、Danger 不随选择变化。
- [x] 默认钴蓝以 `#6E78D5` 和 Hover `#5F6AC1` 为方向锚点，但普通小字号白字按钮使用满足至少 `4.5:1` 对比度的独立 Solid/Foreground 组合。
- [x] 真实 Settings 用户旅程覆盖选择、立即应用、本机保存与重新挂载恢复；共享偏好测试覆盖六个合法标识和全部回退情况。
- [x] 静态入口检查证明 Main 与 Launcher 使用同一默认 Accent，并在 React 挂载前完成应用；Launcher 测试仅补充每次呈现前重新读取的最小断言。

## Verification

- `bun run test:dom src/features/appearance/index.test.ts src/features/settings/components/SettingsPage.test.tsx src/features/launcher/LauncherPage.test.tsx`
- `bun test scripts/check-shell-theme-sync.test.ts`
- `bun typecheck && bun lint && bun lint:boundaries && bun format:check && bun check:animations`
- `bun run test:run --maxWorkers=4 && bun run test:scripts && bun run build`
- 待 Ticket 06 在真实 Tauri 中确认 Main 与预热 Launcher 的跨 WebView 本机存储一致性。
