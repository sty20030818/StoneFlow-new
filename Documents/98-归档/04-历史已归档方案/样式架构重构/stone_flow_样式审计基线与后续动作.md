# StoneFlow 样式审计基线与后续动作（2026-05-06）

## 当前基线

- 审计规则：禁止在业务源码继续出现以下旧写法
  - `sf-color-`
  - `text-(--...)`
  - `bg-(--...)`
  - `border-(--...)`
  - `bg[#...]` / `hover:bg[#...]`
- 例外目录（仅变量声明，允许保留）：
  - `src/styles/tokens/layout.css`
  - `src/styles/adapters/shadcn.css`

## 已固化流程


## 验收命令

```bash
./node_modules/.bin/tsgo -b
```

## 下一步（P4-B / P5 衔接）

1. Pattern 继续收编：把页面层仍可复用的视觉片段收回 `src/shared/ui/patterns/`。
2. 页面层只保留布局与一次性细节，不再定义可复用视觉规则。
3. 当 pattern 消费稳定后，再进入兼容别名回收（`layout.css` 中的 `--sf-color-*`）。

## 约束

- `layout.css` 的兼容别名暂不删除，等消费迁移完成后再回收。
- 本阶段不做视觉重设计，只做语义迁移与归属收口。
