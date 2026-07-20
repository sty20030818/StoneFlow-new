# 文档库清理与结构收口 — Spec

## 背景与目标

清理已完成或过时的阶段方案与流程工具残留，建立符合《文档体系 SOP》的最小可信入口。产品、技术、领域、界面与模块内容重写属于后续独立任务，不包含在本次范围。

## 范围

- 删除仓库本地的 OpenSpec、Comet、Superpowers 和 Workbuddy 过程目录。
- 将现有 `Documents/01-执行计划/`、`Documents/02-重构方案/` 原样归档。
- 归档旧索引、旧文档治理与依赖推荐文档。
- 新建唯一的文档索引与 SOP，清理仓库配置和工作区中的 OpenSpec/Comet 引用。
- 保留现有根目录常青文档和代码同位架构文档正文。

## 不做什么

- 不重写 `P1/P2/D1/T1/T2/U1/X1`。
- 不重写 `src/**/ARCHITECTURE.md` 或 `src-tauri/ARCHITECTURE.md`。
- 不改写归档文档中的历史 OpenSpec/Comet 文字。
- 不删除全局安装的 OpenSpec、Comet 或任何全局技能。

## 验收标准

- 仓库内不再存在 `openspec/`、`.comet/`、`.superpowers/`、`.workbuddy/` 和 `.codex/skills/openspec-*`。
- 旧阶段方案完整保留在 `Documents/98-归档/05-2026-07-阶段方案归档/`。
- 旧治理文档完整保留在 `Documents/98-归档/06-2026-07-文档治理旧版/`。
- `Documents/_INDEX.md` 和 `Documents/文档体系SOP.md` 成为当前文档入口与唯一治理规则。
- 活跃区和配置不再把 OpenSpec 或 Comet 作为可用流程或入口。
- 保留的常青文档与代码同位文档正文没有内容改写。

## 当前技术方案

使用 Git 移动已跟踪文档以保留历史；删除未跟踪且被全局 ignore 的过程目录；只做必要的配置、工作区、索引和 SOP 更新。归档目录保留原主题层级，不重命名内部文件。

## 关联模块

- `Documents/`
- `.oxlintrc.json`
- `.oxfmtrc.json`
- `doctor.config.json`
- `StoneFlow.code-workspace`

## 风险

- 全局 ignore 会隐藏待删除目录，验证必须直接检查文件系统，不能只依赖 `git status`。
- 旧文档路径变更可能留下链接；本次只要求活跃入口和配置不再指向被删除流程目录。

## 完成后需要同步的长期文档

- `Documents/_INDEX.md`
- `Documents/文档体系SOP.md`
