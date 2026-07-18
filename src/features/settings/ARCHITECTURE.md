# settings · 设置

> 作用：描述 **当前已落地** 的 `src/features/settings` 边界  
> 最后更新：2026-07-17

---

## 心智

```txt
设置页 / 侧栏可见性 / 设备偏好
  → api：sidebarSettings · shellDevicePreferences
  → model/useSidebarSettingsStore（sync + device 合并）
  → components：SettingsPage · panels
```

设备级偏好与可同步可见性分轨，由 store 合并为壳可用的 `ShellSidebarSettings`。

## Public

- 设置读写 API 与类型  
- `useSidebarSettingsStore` + selectors  
- `SettingsSidebar` + `SETTINGS_NAV_GROUPS`（设置模式侧栏，由壳挂载）  
- 页面经 `/page`
