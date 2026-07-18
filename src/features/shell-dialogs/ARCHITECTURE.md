# shell-dialogs · 壳级对话框 / UI 瞬时态

> 作用：描述 **当前已落地** 的 `src/features/shell-dialogs`  
> 最后更新：2026-07-17

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
