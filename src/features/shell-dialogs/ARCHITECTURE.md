# shell-dialogs · 壳级对话框 / UI 瞬时态

> 作用：描述 **当前已落地** 的 `src/features/shell-dialogs`  
> 最后更新：2026-09-13

---

## 心智

```txt
不持有业务规则；只 open/close 与草稿壳状态。

useDialogStore
  → 命令菜单 / 快捷键帮助 / 创建任务|项目 dialog / 自定义日期 dialog

useShellPreferenceStore
  → 项目树会话级折叠 + 任务 Board 本机持久化折叠偏好
```

layout 与 feature 均可 `@/features/shell-dialogs`。  
创建表单在 task/project；本包只提供「是否打开 + 初始 draft」。

任务 Board 的 `taskBoardCollapsedGroups` 以来源身份和主分组方式的组合键隔离，保存完整 header key（如 `h:status:todo`）数组，缺省全部展开。`setTaskBoardCollapsedGroups` 只去重并保存键，不解释任务分组；来源身份和交互恢复归 `useTaskCollectionScene`。持久化只包含任务 Board 折叠偏好，项目树仍是会话状态；旧全局状态组偏好缺少来源身份，不复制为各工作台的折叠事实。

自定义日期可以叠加在现有创建窗口上：打开与取消日期窗口均保留创建意图、初始 draft 和呈现状态，由仍挂载的领域表单持有实际输入。关闭创建会话时同步清除上层日期窗口及其回调；显式打开命令菜单、快捷键帮助或另一创建会话时仍遵循既有替换规则。Shell 的兜底 Escape 优先关闭自定义日期，之后才是创建窗口，不能越层关闭底层会话。
