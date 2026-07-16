# Shell Command Bridge

把壳侧能力组装成 `ShellCommandActions`，供 `useCommandRuntime` 使用。

## 新增命令动作

1. 在 `slices/` 对应文件加方法（或新建 slice）  
2. 在 `useShellCommandActions.ts` 的 `composeShellCommandActions(...)` 里挂上  
3. 若改了 `ShellCommandActions` 类型，同步 `features/command/adapters`

## 切片

| 文件 | 职责 |
|------|------|
| menuSlice | 命令板、帮助、搜索 |
| createSlice | 新建任务/项目、picker |
| layerSlice | Esc 关层优先级 |
| submitSlice | 表单提交 |
| navSlice | 导航、侧栏、前进后退 |
| previewSlice | 右侧预览 |
| filterSlice | 页筛选 |
| taskMetaSlice | 任务 meta picker |
| bulkSlice | 批量归档/删除等 |
