# 07 子分组贯通分页与层级交互：实施与验证

日期：2026-09-13。状态：`implemented-awaiting-acceptance`。

前置 06 已提交为 `276f427f feat(views): 统一主分组分页与折叠选择`，提交后工作区干净；07 沿用户授权实施，未推送。

## 已实现

- `subGroupBy` 进入 Default/Saved 共同请求、Query key 与 cursor v3。主组 none 或主子同维度时，偏好、面板与查询共同归一为 none；只提供页面 capability 允许的不同维度组合。
- SQL 复用既有总序编译器，以主组、子组为前缀再排叶组任务。组序固定；natural/recency 只作用于叶组，两个日期维度不会混用桶。旧 cursor 版本和不同有效子组明确拒绝，不保留兼容执行器。
- 查询窗口返回 `group/subGroup`。Display 保留严格两层 `sections/children`，用完整父身份组合子组 key；合并同路径跨页成员，父级保留全部已加载后代，选择顺序只投影一次。
- 父子组进入原有 flat items、导航映射、唯一虚拟 renderer 和单行 sticky。父折叠隐藏后代，子折叠只隐藏自身任务；Shift 选择以叶组为边界，父/子菜单只操作各自已加载成员。
- 查询窗口切换时重建 Board DOM 焦点桥并清除分组重入目标；场景已消费但仍等待虚拟节点挂载的旧请求，不能在新窗口同 key 节点出现时兑现。
- 子组普通标题缩进 16px，sticky 使用同一行 36px 显示“父组 › 子组”；按钮名称带父路径。状态动作只属于自身为状态的层级，不从祖先或标题猜测。折叠全部由菜单显式指定可见父组恢复焦点；离屏目标先滚动再等待原 focus bridge 挂载。
- 折叠身份包含来源、有效主分组与子分组；配置切换不串状态，重启本机偏好恢复。没有递归树框架、第二套选择状态或服务端总数占位高度。

## 回归证据

- 真实 SQLite 337 条任务，20 种不同主子维度组合 × 4 种叶序 × natural/recency，共 160 种三页查询。对照独立比较器逐行核对顺序、组身份、跨页唯一性与完整性；Saved/Default 执行一致。两个日期桶和无效子分组归一化另有回归。
- Display 使用同名项目父组和同名日期子组证明完整路径身份、输入次序、唯一选择次序；API/Query 测试覆盖子组进入请求、归一后的 key 和慢旧页隔离。
- 模型回归先在旧单层投影失败，改动后验证准确 flat 顺序、父子成员范围、叶选择映射、父折叠隐藏后代，以及重新展开保留子折叠。
- 真实 Project 页面使用 Router、Query、生产 Display/scene/TaskBoard，仅替代 Tauri IPC 与 jsdom viewport 几何。验证同名子组、混合完成态、子组跨页、加载前选择、失败重试同 cursor、追加成员不自动选中、父菜单补选和兄弟隔离。
- 同一页面覆盖 Shift 叶组边界、真实预览 controller/Card 关闭后任务焦点恢复、切换子分组、重新创建 QueryClient，以及清掉内存后从真实 localStorage rehydrate 恢复折叠。未聚焦任务时从子菜单折叠全部，焦点回到父组；展开全部恢复所有已加载后代。
- Board direct/memo 最终 29 项通过；额外覆盖单行 sticky 文案和高度、连续 aria-rowindex、非状态子组不继承状态创建入口、离屏父组滚动后恢复焦点。
- 末次审查真实复现两个旧 pending 请求跨窗口抢焦点：分别等待任务行和分组按钮挂载；绑定窗口后转绿。分组用例进一步复现旧 reentry 在新窗口手动聚焦同 key 按钮后由 ArrowDown 兑现，清理重入目标后通过。
- 已有 UI Lab 的真实 Display 面板在浏览器检查：无主分组时子组禁用；项目页面选择优先级主组后，子组不提供优先级和项目，能选状态；截图确认面板布局正常。UI Lab 不执行真实任务查询。

## 全仓门禁

- Rust workspace：297 项通过，12 项依赖外部 PostgreSQL 的既有测试按条件忽略；Rust fmt 通过。
- `bun run test:run`：219 个文件、1316 项通过；末次焦点修复后，Board、memo 与真实查询页面 3 个文件、50 项再次通过。
- `bun run test:release`：14 个文件、153 项通过，只验证发布逻辑，未执行发布。
- `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run check:animations`、`bun run format:check` 与 `git diff --check` 通过；末次 typecheck/lint 再次通过，lint 零警告。根格式化覆盖 950 个匹配文件。

## 验收边界

- 没有启动开发服务或原生 StoneFlow，没有修改正式数据库。浏览器面板、DOM 页面和真实 SQLite 查询分别证明各自层面，不替代 09 的实际 Tauri 现场验收。
- 精确分组数量与空候选留给 08，本票只展现已加载的实际非空父子组。
- 未增加跨并发写入快照、新依赖、数据库迁移或同步 wire 变化。Display/Board 与 A2/A3 权威文档已同步。
