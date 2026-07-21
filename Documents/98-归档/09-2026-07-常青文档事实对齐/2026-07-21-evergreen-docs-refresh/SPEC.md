# 常青文档事实对齐 - Spec

## 背景与目标

StoneFlow 的长期文档仍保留项目启动阶段的产品定位、技术栈和模型描述。它们与当前代码及已确认的产品方向发生漂移，且尚未迁入文档体系 SOP 定义的目录。

本任务将常青文档收口为清晰、可长期维护的当前真相：产品文档记录已确认方向，架构文档记录当前实现，未来的领域模型改造不伪装成已落地事实。

## 范围

- 建立根 `README.md` 与 `ARCHITECTURE.md`。
- 将产品、领域、系统和界面文档迁入 `Documents/00-产品/` 与 `Documents/01-架构/`。
- 重写 P1、P2、A1、A2、A3，使其分别拥有单一职责。
- 将同步协议的长期实现说明迁入 `sync-worker` 模块 DESIGN。
- 将旧 `X1-决策日志.md` 与旧版长期文档归档。
- 更新 `_INDEX.md`，使其成为当前文档地图。

## 不做什么

- 不修改 Task、Project、View、Space 或同步的代码实现。
- 不把 Inbox 移除、WorkStatus/WorkPriority/WorkTime 抽取、Project 字段补齐和级联恢复写成当前实现。
- 不为每个代码模块补齐 README 或 DESIGN；本任务只先建立项目级长期文档。
- 不补写旧 ADR。

## 验收标准

- 根目录存在项目入口与整体架构文档。
- 当前长期文档只存在于 SOP 规定的位置，并可从 `_INDEX.md` 找到。
- 产品文档不再描述团队协作、账号系统、资源附件、Inbox/Focus 或双态任务为当前方向。
- A1/A2 与当前代码模型一致，并显式标注产品目标尚未实现的边界。
- 旧长期文档与决策日志可在归档中追溯。

## 当前技术方案

以代码为实现事实源，以本轮已确认的产品决策为产品事实源。每一类事实只由一份常青文档完整维护；其他文档通过链接引用。

## 关联模块

- `src/app/`、`src/routes/`、`src/features/*/`、`src/shared/`
- `src-tauri/crates/{domain,usecase,storage,runtime,platform,sync-worker}/`
- `Documents/`

## 风险

产品目标与当前数据模型存在刻意差距。若没有明确区分，后续实现会被误导，或文档会再次过期。

## 完成后需要同步的长期文档

- 根 `README.md`
- 根 `ARCHITECTURE.md`
- `Documents/_INDEX.md`
- `Documents/00-产品/P1-产品内核.md`
- `Documents/00-产品/P2-产品蓝图.md`
- `Documents/01-架构/A1-领域模型.md`
- `Documents/01-架构/A2-系统设计.md`
- `Documents/01-架构/A3-界面系统.md`
