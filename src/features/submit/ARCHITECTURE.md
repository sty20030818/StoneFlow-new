# submit · 提交注册平台

> 作用：描述 **当前已落地** 的 `src/features/submit` 边界  
> 最后更新：2026-07-17

---

## 心智

```txt
创建/编辑表单 register SubmitTarget
  → SubmitRegistry
  → 命令 save/submit* → registerSubmitCommands → registry.submitActiveTarget
```

## Public

- Provider / hooks / `useSubmitTargetFromForm`
- `registerSubmitCommands(host)`
