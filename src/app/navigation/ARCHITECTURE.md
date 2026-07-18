# 导航架构（收口后）

> 2026-07-17 · S1 单树 + 模块合并

## 目录（仅此）

```txt
index.ts                 # 公共出口
path.ts                  # 方言 + build + parse→AppRoute
shellLocation.ts         # ShellRoute 类型 + fromMatch + parseShellRoute
ShellRouteContext.tsx    # Provider / useCurrentShellRoute
intents.ts               # open* → path build
memory.ts                # 记忆规则 + 启动校验（纯）
memoryStore.ts           # Tauri Store IO
sessionHistory.ts        # 会话最近浏览
breadcrumb.ts            # 面包屑
useRememberCurrentShellRoute.ts
```

## 纪律

- 业务侧只 `from '@/app/navigation'`
- 禁止第二套 path 规则
- 运行时：`shellRouteFromMatch`；字符串 parse 仅 memory/历史
- memory **v3**：只记 rememberable 白名单内的 canonical 工作区 path；非法 payload / path 丢弃并回退 fallback
