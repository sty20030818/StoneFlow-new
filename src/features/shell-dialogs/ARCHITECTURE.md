# shell-dialogs · 壳级对话框 / UI 瞬时态

> 作用：描述 **当前已落地** 的 `src/features/shell-dialogs`  
> 最后更新：2026-09-08

---

## 心智

```txt
不持有业务规则；只 open/close 与草稿壳状态。

useDialogStore
  → 命令菜单 / 快捷键帮助 / 创建任务|项目 dialog / 自定义日期 dialog

useShellPreferenceStore
  → 本机会话级 UI 偏好（树折叠、看板分区展开等）
```

layout 与 feature 均可 `@/features/shell-dialogs`。  
创建表单在 task/project；本包只提供「是否打开 + 初始 draft」。

自定义日期可以叠加在现有创建窗口上：打开与取消日期窗口均保留创建意图、初始 draft 和呈现状态，由仍挂载的领域表单持有实际输入。关闭创建会话时同步清除上层日期窗口及其回调；显式打开命令菜单、快捷键帮助或另一创建会话时仍遵循既有替换规则。Shell 的兜底 Escape 优先关闭自定义日期，之后才是创建窗口，不能越层关闭底层会话。
