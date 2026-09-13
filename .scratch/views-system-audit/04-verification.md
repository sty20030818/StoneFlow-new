# 04 筛选语义与空态验证记录

日期：2026-09-13。实现基线：03 提交 `41773248`。

状态：`implemented-awaiting-acceptance`。04 代码与本地验证完成，实施结束时保持未暂存、未提交；后续原生证据与验证边界见下文及 09。

## 修复与责任边界

- 前端共同 normalize 入口拒绝非法定义，保留独立条件之间的 AND；只做稳定排序、条内去重、完全相同条件去重，编辑 ID 唯一且稳定。移除会删除同字段其他条件的旧 helper。
- URL 编解码只把缺失参数视为无 Draft；空字符串、非法形状/值、损坏 UTF-8 明确失败，由既有路由错误边界阻止任务查询。Saved View 的非法筛选复用 03 的单条不可用恢复。
- Rust 当前 DTO 必须显式提供 clauses；旧扁平空对象仅在既有 legacy 解码边界转换。共同 SQL predicate 入口校验条件，list/count 不再跳过非法字段和值。
- FilterMenu 与 FilterBar 复用按 clause id 编辑的组件；scope/context/baseViewKey 只读投影来自实际查询，名称取已有数据。保留负向条件、同字段其他条件和目录中缺失的项目值。
- 三类 scene 复用准确空态：仅完整上下文 all 查询且精确 count=0 说明没有任务；其他零结果是当前视图无匹配。“调整筛选”复用现有菜单事件，不增加数据读取。
- 未增加依赖、第二份筛选待提交状态、全量任务读取或数据迁移。

## 自动验证

已实跑红→绿：

- normalize 原 5 个失败证明静默丢非法条件、合并 AND 为 OR、重复 ID 和相等性错误；修后 18 项通过，其中 11 项共用 JSON 夹具。
- URL/parser 原 2 项失败证明坏链接被忽略；修后通过；追加损坏 UTF-8 拒绝和真实 Router loader 不执行的回归。
- Rust application 原 2 项失败（缺 clauses / 非规范优先级），storage 原 1 项失败（非法字段被忽略）；修后 View 聚焦 application 16、storage 12 项通过。
- 同一 `tests/fixtures/filter-query-semantics.json` 由前端跑真实 normalize，Rust 对 raw/normalized 分别跑真实 SQLite 查询与 count；11 组覆盖 AND、排除、空项目、日期重叠、矛盾条件和条内排序去重。
- 空态聚焦 4 文件 34 项通过，覆盖四类来源、完整上下文、首屏 loading/error/retry、缺失 count、续页失败与同 cursor 恢复。
- `bun run test:rust` 全工作区通过。12 项 PostgreSQL 外部集成测试因缺少测试数据库配置按既有规则 ignored；不宣称外部验收。

最终检查：

- `bun run test:run`：217 文件、1275 项通过。首轮两个旧测试误锁定规范化数组顺序；改为保留两个独立条件的语义断言，关闭菜单与焦点验证未放宽。
- 最后焦点时序与测试整理后，5 个受影响文件再跑 30 项全部通过；含真实 Router 的重复添加不认领旧 ID、同字段条件逐条编辑、等价去重后编辑入口卸载、dirty→clean 卸载焦点恢复。
- `bun run lint`（零警告）、`bun run typecheck`、`bun run lint:boundaries`、`bun run format:check`（948 文件）均通过。
- 只读复核发现并闭合两处额外风险：非法 UTF-8 被替换成可执行字符，以及添加重复单值条件认领旧 ID 后扩大原条件。没有遗留已确认的 04 实现缺口。

## 浏览器与剩余验收

使用现有 `http://localhost:5173/ui-lab.html`，未启动开发服务。样例为第十四批“ComboBox / Autocomplete → 可搜索属性菜单”的 Current 生产组件。

- 初始 clean 可检查完整范围、任务归属、默认视图、两条正负状态与长项目名条件；FilterBar 隐藏。
- 1280×720 各条件完整。480×720 初次发现 HeroUI 的 `max-width:48svw` 把菜单压窄并裁切删除按钮；局部改为 viewport 安全宽度后实测 popover x=12…332、宽 320px，内容与条件组无横向溢出，全部删除按钮在浮层内。长名称完整换行；滚动后底部“计划时间”位于 y=464…500，处于浮层 y=12…507 内。
- 负向状态条件用 Enter 添加“已完成”后仍为排除，包含条件与项目条件保留；Escape 回到父菜单时新条件仍在，再关闭焦点返回“筛选”。一级/二级搜索框 ArrowDown 均进入首个可用字段/值。
- 点击恢复后 FilterBar 消失（DOM count=0），焦点保持在“筛选”。测试结束已还原浏览器 viewport override。
- 本票实施时未运行原生 StoneFlow；本记录中的浏览器与 Router/SQLite 证据只证明对应层面。后续 Tauri 原始操作及 200% 缩放见 [09 记录](./09-verification.md)，实际错误朗读仍待确认；真实设备同步未验另行记录，不新增为本包完成条件。
