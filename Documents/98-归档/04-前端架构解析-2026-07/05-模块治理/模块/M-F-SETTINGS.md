# M-F-SETTINGS · features/settings

> 日期：2026-07-17
> 状态：**decided** · **S1 已落地（[19](../19-Settings样板重构执行计划.md)）** · 2026-07-19
> 类型：**scene + 本机/侧栏配置 API**（mixed）
> 切分：**Keep**；**三入口**已是最佳实践标杆

---

## A. 现网

### 三入口（保持）

| 入口 | 用途 |
|------|------|
| `@/features/settings` | 壳用 API：侧栏偏好、设备偏好；**再导出 contract**；**不含 Page** |
| `@/features/settings/contract` | 分区 key + 上次分区记忆（navigation 安全） |
| `@/features/settings/page` | 仅 routes 挂 `SettingsPage` |

### 内容

- `SettingsPage` 薄路由壳 + **panels**：General / Sidebar / Sync / Update
- Sync/Update **面板消费 sync/update public**（Sync 面板 ~806 行偏厚）
- `sidebarSettings` / `shellDevicePreferences` api（刀已收口设备偏好）

### 已做对

- 三入口防环（navigation 不拉 Page）
- 系统能力不重写，装配 sync/update
- 设置模式侧栏与 routes section 协作

### 问题

| 问题 | |
|------|--|
| SettingsSyncPanel 过厚 | 可拆子块或更多逻辑回 sync |
| General 含默认 space | 调 space public — OK |
| layout SettingsSidebar | 壳模式切换；内容导航可逐步 settings public（layout 卡已述） |

---

## B. 方案

| 方案 | 结论 |
|------|------|
| **S1 Keep + 三入口 + 面板减重** | **✅** |
| 拆 settings-sync / settings-update feature | ❌ 过拆 |
| 配置 API 并入 layout | ❌ |
| 取消 contract | ❌ |

---

## C. 决议

1. **Keep** settings；三入口 **冻结为规范**
2. 面板只 **装配** sync/update/space public
3. SyncPanel 体量债内拆，非切分问题
4. decide-only

协作：routes → page；navigation → contract；layout chrome → 主入口 API；Settings 模式骨架可在 layout。

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：三入口、S1 |
| 2026-07-19 | S1 落地：public 收窄 + SyncPanel presentation；见 [19](../19-Settings样板重构执行计划.md) |

