# StoneFlow 可靠性、性能与实现收敛

**Status:** completed; archived; external acceptance transferred
**Triage:** completed
**日期:** 2026-09-07
**前置:** [Row 与集合列表单轨架构改造](../task-row-list-architecture/spec.md)已完成；[统一产品验收](../../unified-product-acceptance/spec.md)继续独立执行。

## 2026-09-07 归档收口

本工作包的工程实现与自动化门禁已经完成：同步远端身份、cursor 与显式 rebind 改为 fail closed；PostgreSQL 地址展示丢弃 authority、query 与 fragment 中的敏感信息；每个成功同步 round 及 rebind 提交后都独立发出工作区失效事件。任务详情由唯一 Router blocker 在离开前兑现 dirty draft，失败时保留原任务与草稿。Task scene 只构建一份 collection projection 和 task-by-id 索引，TaskBoard、selection、Command 与 Preview 复用同一身份；键盘/指针 modality 由集合根与 CSS 处理，不恢复逐 Row pointermove。Saved View 改用 HeroUI Pro ListView，低频 Overlay 与 Launcher Advanced 按需加载，图片替换为展示尺寸衍生资产，并新增生产 bundle 预算。

发布链在 frozen install 前要求 `HEROUI_AUTH_TOKEN`，token 只传给安装进程；随后依次执行依赖审计、HeroUI Pro 版本范围/必需入口/动态加载验证和 Tauri build。`tar` 通过 Bun override 收敛到 `7.5.22`。已删除零消费者的 Lifecycle 写 façade、ports、storage adapter 写路径及相关泛型，保留真实 Task、Project、Space 写服务和现有 operation-id 语义。

按任务发起人的最终反馈，单元测试不再用 150/10,000 条输入冒充压测：collection 与索引契约改用 24 条日常数据，并把 Vitest worker 上限设为 4，未放宽默认单测 timeout。最终证据如下：

- `bun run check` 通过：Vitest 199 个文件、997 项；Bun scripts 21 个文件、177 项；Rust workspace 249 项通过，9 项真实 PostgreSQL 合约测试因未提供测试库按条件 ignored。
- `bun run test:release` 通过：14 个文件、153 项。
- `bun run build` 与 bundle budget 通过：Main 初始 JS `1,672,265 B raw / 516,828 B gzip`，Launcher `575,680 B / 181,731 B`；最大初始 chunk 分别为 `705,751 B / 207,254 B gzip` 与 `286,211 B / 90,117 B gzip`；`avatar.jpg` 为 `6,480 B`，`StoneFlow.png` 为 `20,990 B`。
- `bun audit --json` 返回空 advisory；`bun pm why tar` 确认实际解析 `tar@7.5.22`；本机已安装 HeroUI Pro artifact 的版本范围、`./list-view`、`./sheet` 和运行时加载验证通过；`git diff --check` 通过。

真实 PostgreSQL v1→v2/mismatch、两套远端 rebind、macOS/Windows WebView 原生滚动与混合输入、真实 CI token 的 clean detached install、平台签名和更新包仍未执行，已登记到统一产品验收，不能写成通过。归档后发现的新问题另建工作包，不重新打开本包。

## Problem Statement

StoneFlow 已完成 Row、Section Header、集合滚动容器和 TanStack Virtual 单轨改造，但对真实代码路径的复核发现，当前工程仍有几类不能靠局部样式修补解决的问题。

第一类是安全与数据正确性。同步配置只脱敏 PostgreSQL authority 中的密码，SQLx 同样支持的查询参数密码仍可能进入日志与 renderer；同步 cursor 没有绑定具体远端实例，更换远端后可能跳过新远端的早期数据并把旧副本数据上传过去；连续同步中前一轮已经提交而后一轮失败时，前端可能收不到已落库变化通知；任务详情在自动保存失败后仍允许切换或关闭，内存草稿会随组件重置或卸载而丢失。

第二类是交互性能与视觉契约。虚拟化已经控制挂载 Row 数量，但焦点移动仍在全量 key 和 task 上重复执行线性扫描与 Map 构建；移除逐 Row pointer-move 状态后，键盘模式没有在集合根暴露给 CSS，静止鼠标所在旧 Row 与键盘当前 Row 可能同时呈现 current 视觉；Saved View Library 仍维护页面私有 Row 皮肤，没有消费已经确定的集合组件与设计系统事实源。

第三类是发布、启动与架构收敛。HeroUI Pro 当前安装链包含存在已知高危漏洞的传递 `tar` 版本，正式 detached release 只执行 frozen install，没有在构建前 fail closed 地确认凭据和最终私有产物；README、A2 与 ADR 仍描述旧 acquisition 方式。Shell 又提前加载低频 Overlay 和 Markdown 解析图，Vite 的宽泛 vendor 分组阻碍按入口切分，Header 使用远大于展示尺寸的图片。Rust Lifecycle 域同时保留一条没有消费者且永远返回 pending 的写路径，与真实 Task、Project、Space 写服务形成假双轨。

这些问题应作为一个收敛工作包处理，但不能做成新的万能框架。每个根因回到已有共同 Owner：同步协议持有远端身份与 cursor，详情导航持有离开前保存，集合 projection 持有索引，集合根持有输入 modality，发布入口持有供应链前置条件，实体服务持有生命周期写入。所有旧兼容壳、死接口和无消费者路径在同批迁移后删除。

## Solution

按风险和依赖顺序完成四个阶段，阶段之间只共享已经稳定的公共契约，不引入临时双轨。

### 阶段 1：安全、保存与同步一致性

- 使用项目已有 URL 解析能力结构化解析 PostgreSQL 连接串。展示地址只保留定位远端所需的非敏感部分，移除 authority password 以及 SQLx 支持的敏感查询参数；日志、诊断状态和 renderer 不再接触完整连接串。
- 为远端数据库建立稳定实例身份，并把本地绑定、server cursor 与该身份关联。普通同步只允许命中已绑定实例；检测到不同实例时 fail closed，不复用 cursor、不上传 outbox，也不静默清空本地数据。
- 提供显式 rebind 入口和用户确认语义。只有用户明确选择重新绑定且前置条件满足后，才清理旧远端专属同步位置并从新远端重新建立基线；本地未同步更改或不能证明安全迁移时阻止操作并给出可理解反馈。
- 每轮同步成功提交 SQLite 与 cursor 后立即发出该轮 workspace change event。后续排队轮次失败仍保留真实失败状态，但不能吞掉前一轮已提交变化的失效通知。
- 把任务切换、关闭详情和 Sheet dismiss 统一收口到可等待的离开详情 transition。dirty draft 只有在 flush 成功后才允许离开；失败时保留当前任务、草稿和错误反馈。无法阻止的宿主卸载不再承担主要保存保证。

### 阶段 2：集合交互与样式事实源

- 在 collection projection 建立稳定的 key-to-index Map，并让同一 Map 同时承担 membership 与邻接定位；键盘导航、focus validation、range 邻接与选中判断复用同一 projection，不在每次按键重复 `includes` / `indexOf`，也不为相同 key 再复制 Set。
- 在 task 数据 identity 变化时建立一次 task-by-id 索引，由 command selection 和 preview lookup 复用。先消除重复全量构建；只有渲染计数证明确有无关消费者更新时，才进一步拆分 preview 订阅。
- TaskBoard 与 CollectionGrid 根统一暴露当前 `data-focus-source`。键盘模式下，CSS 抑制静止鼠标命中的非 current Row 背景和 reveal；pointerdown 恢复 pointer 模式。不得恢复逐 Row pointermove 监听或为每个 Row 保存 hover 状态。
- Saved View Library 直接使用现有 HeroUI Pro ListView 的 Item、ItemContent 与 ItemAction，保留打开、编辑、删除、键盘与菜单事件隔离；删除页面私有边框、圆角、hover 和重复 list/listitem 皮肤。
- 保持 TanStack Virtual 单轨、固定 Row 几何与现有分页模型。本任务不恢复 ordinary list、阈值切换、feature flag 或第二套 renderer。

### 阶段 3：发布供应链与启动成本

- 将 HeroUI Pro 安装链使用的 `tar` 锁定到已修复当前 advisory 的版本，并验证 lockfile 中所有解析路径均收敛到安全版本；不等待上游发布才保护本项目构建机。
- 正式 release preflight 在 detached clone/install 前只检查 `HEROUI_AUTH_TOKEN` 是否存在，不打印、保存或传递其值到日志。缺少凭据立即失败，不等到编译阶段产生间接错误。
- frozen install 后验证最终 HeroUI Pro 包版本、必需入口及可加载性，确认 public bootstrap 已被真实私有产物替换。若供应商没有提供可验证的不可变 digest，文档明确保证边界，不把 lockfile 误写成私有 archive 的完整性证明。
- 更新 README、A2 与 ADR-0002，使开发安装、CI/release 凭据名、版本事实和可复现边界与当前实际流程一致；删除旧 `hpsetup`、旧变量名和已经失真的精确树摘要承诺。
- 保留更新检查等必须常驻的轻量 controller，只对 About、Changelog、Create 等低频 presentation 做按 open intent 的 lazy load；关闭状态不提前实例化 Markdown 解析图。
- 删除 Vite 中把所有剩余第三方模块强制合成单一 vendor 的宽泛 fallback，让构建器按真实入口切分；已有稳定且有共同缓存价值的明确分组只在产物证据支持时保留。
- 为 Header 换用符合 1x/2x/3x 展示需求的小尺寸、去元数据资产，并在确认旧大图零消费者后删除它们。

### 阶段 4：死路径删除、回归门与文档收口

- 删除 Lifecycle application service 中永远失败的 archive/restore/delete/permanent-delete 写方法、对应写 ports、无消费者的 sync/activity 泛型与 storage adapter 实现。Lifecycle 只保留 archive/trash 查询编排，写动作继续唯一委托 Task、Project、Space 公共服务。
- 补齐 Project 与 Task、Space 对称的 operation-id 生命周期 characterization 后，修正产品蓝图中已经过时的“级联恢复未对齐”描述；不删除仍有真实消费者的数据规则。
- 增加稳定的 bundle 预算检查，读取生产构建产物而非 wall-clock，限制 Main/Launcher 初始传递依赖的 raw/gzip 回归；预算基于本次优化后的实测基线并保留少量明确余量。
- 增加不依赖产品路由的 collection 结构回归，以日常规模数据验证 projection/index 只构建一次和 focus 路径正确；真实性能继续由 profiler 与统一产品验收判断，不在单元测试中模拟压测。
- dependency audit 作为 release 前置验证；网络或 registry 不可用时明确失败原因，不把 404 或未执行当作无漏洞。
- 更新 Documents 索引、模块 ARCHITECTURE 与统一产品验收输入。真实 macOS/Windows WebView、原生 fling、VoiceOver、缩放、签名更新包和平台 trace 仍由统一产品验收记录，未执行项保持未通过。

### 总完成判据

- PostgreSQL 凭据无论出现在 authority 还是受支持的查询参数中，都不会进入日志、状态或 renderer。
- 同步 cursor 与明确的远端实例绑定；切换远端不再复用旧 cursor、跳数据或静默上传旧副本数据；连续轮次失败不会隐藏已提交变化。
- 任务详情保存失败时不能切换或关闭，草稿和反馈保持可恢复。
- collection 键盘焦点热路径不再随全部已加载任务重复线性扫描；键盘与 pointer current 视觉在混合输入中只有一个事实源。
- Saved View、Task、Project、Lifecycle 的通用集合视觉均消费现有设计系统 Owner，不保留页面私有 Row 皮肤。
- 正式 release 对 HeroUI 凭据和最终产物 fail closed，已知 `tar` advisory 从解析树消失，文档不再描述旧流程或过度承诺。
- Launcher/Main 的初始传递 bundle 和 Header 图片体积下降，并留下稳定预算；低频 Overlay 首开行为和更新入口不回归。
- Lifecycle 第二写路径及相关兼容、dead-code suppression、无消费者 adapter 全部删除，长期文档只描述真实单轨。
- 根级检查通过；自动化与真机验收边界分别陈述，不把未执行的平台验证标为完成。

## User Stories

1. 作为使用自建 PostgreSQL 或托管 PostgreSQL 的用户，我希望任何合法连接串形式中的密码都不会出现在日志或界面诊断中，从而避免凭据意外泄漏。
2. 作为同步用户，我希望 StoneFlow 能辨认当前连接的是哪一个远端实例，而不只比较看起来相同或不同的 URL。
3. 作为更换同步服务器的用户，我希望应用在可能混合两个数据集前明确阻止并解释风险，而不是静默复用旧进度。
4. 作为确认重新绑定的用户，我希望新远端从完整基线开始同步，不跳过序号较早的记录。
5. 作为有本地待上传修改的用户，我希望 rebind 在无法安全归属这些修改时停止，从而不会把旧副本数据传到错误远端。
6. 作为连续同步用户，我希望前一轮已经成功写入本地的数据立即出现在界面，即使下一轮网络请求失败。
7. 作为编辑任务详情的用户，我希望自动保存失败时详情保持打开且草稿仍在，从而可以重试而不是丢失输入。
8. 作为在任务之间快速切换的用户，我希望只有当前任务保存成功后才进入下一任务，避免草稿与 active task 错配。
9. 作为使用 Escape、关闭按钮或点击 Sheet 外部关闭详情的用户，我希望这些离开路径遵守同一个保存合同。
10. 作为键盘用户，我希望在数千条任务中连续移动焦点仍保持稳定，不因全量列表扫描而逐渐变慢。
11. 作为同时使用鼠标和键盘的用户，我希望静止鼠标所在旧 Row 不会与键盘当前 Row 同时高亮或同时露出动作。
12. 作为鼠标用户，我希望再次点击 Row 后立即恢复 pointer 视觉，不需要移动鼠标触发状态修正。
13. 作为 Saved View 用户，我希望收藏视图列表与产品其它集合使用同一 hover、focus、圆角、密度和操作布局。
14. 作为屏幕阅读器和键盘用户，我希望 Saved View 的打开与尾部菜单仍有准确语义，且菜单操作不会误触主 Row。
15. 作为发布维护者，我希望正式 release 在缺少 HeroUI 凭据时立即以明确错误停止，而不是在后续编译中模糊失败。
16. 作为发布维护者，我希望 frozen install 后能确认实际使用的是完整 HeroUI Pro 产物，而不是只安装了公开 bootstrap。
17. 作为安全维护者，我希望已知高危解包依赖不会继续运行在开发机或发布机上。
18. 作为新贡献者，我希望 README 与架构文档给出的安装变量和步骤就是当前代码实际使用的方式。
19. 作为 Launcher 用户，我希望启动时只解析该界面真正需要的代码，不提前承担 About、Changelog 或创建页的依赖。
20. 作为主窗口用户，我希望 Header 只解码符合显示尺寸的图片，不为 28–32px 图标加载千像素素材。
21. 作为维护者，我希望 Lifecycle 写入只有 Task、Project、Space 服务这一条真实路径，不被一个公开但永远失败的 façade 误导。
22. 作为维护者，我希望共享业务知识只在一个 Owner 中变化，同时删除只因历史迁移留下的 ports、泛型和兼容说明。
23. 作为性能维护者，我希望 bundle 和 collection 热路径有稳定、可重复的回归门，而不是依赖主观感觉或易抖动的时间阈值。
24. 作为验收人员，我希望自动化、production build 与真实 WebView 证据分别记录，从而知道哪些结果已确认、哪些仍需设备验证。
25. 作为长期维护者，我希望这次收敛后没有 remote 兼容双轨、普通列表 fallback、页面私有 Row wrapper、临时 benchmark route 或无退出条件 feature flag。

## Implementation Decisions

- 单一工作包按四阶段实施，先保护数据与凭据，再优化交互，随后处理发布和启动，最后删除死路径并收口证据。每阶段都可独立审查，但不为过渡状态建立长期兼容 API。
- URL 脱敏复用现有 `url` crate；输出采用安全字段白名单，而不是维护不断增长的敏感参数黑名单。完整连接串继续只存在于已有安全存储和建立数据库连接的边界内。
- 远端身份由远端数据库持久化生成并返回，不能以 URL、sequence 或本地随机值代替。cursor 与 identity 同一事务边界持久化；没有 identity 的既有远端在首次握手时原位初始化，不维护旧协议分支。
- rebind 是显式危险操作，不塞进普通“保存 URL”。普通配置发现 identity mismatch 时返回可识别错误；确认入口复用现有对话框和命令边界，检查 pending outbox 后再执行单一路径重建。
- 已提交同步轮次立即 emit；frontend 现有 debounce 负责合并相邻 invalidation，不在 runtime 累积跨轮事件而形成第二个事务语义。
- 详情离开控制由能决定 active task 和 drawer open 状态的 owner 持有。Autosave controller 只报告 flush 结果，不承担导航；各按钮和 dismiss 不复制保存逻辑，统一调用同一个 async transition。
- collection key 索引属于 projection 的派生数据，与 projection 同时创建和失效。task-by-id 属于 task 集合派生数据，与 tasks identity 同时创建；不增加单实现 factory、通用缓存类或额外状态源。
- 输入 modality 由 collection 根以 data attribute 暴露，Row CSS 只消费合同。禁止重新引入逐 Row pointermove、hover React state 或为兼容旧选择器保留重复样式。
- Saved View 直接组合 HeroUI Pro ListView，不创建 StoneFlow 专属 ListView wrapper；只有已确认会同步变化的产品结构才进入共享层。
- HeroUI `tar` 修复使用 package manager 当前支持的最小 override/resolution 机制，不 fork vendor 包。正式 release 检查 token presence 和安装结果，绝不读取、打印或保存 token 值。
- HeroUI 私有 artifact 的保证以可观察事实为准：验证 package version、必需入口和真实实现标记；供应商未提供不可变 digest 时，ADR 明确这一剩余信任边界，不伪造 checksum。
- Overlay lazy boundary 只包低频 presentation，不延迟必须接收后台事件的 controller；不为每个 Dialog 建立 loader abstraction。
- 先移除宽泛 vendor fallback并用 production build 观察自动切分；只有多个入口真实共享且体积稳定的大依赖才保留明确 chunk。CSS 不在没有首帧证据时强拆。
- 图片生成展示尺寸衍生资产后，生产引用一次性迁移并删除零消费者原图；不保留重复尺寸与兼容 alias。
- Lifecycle hard cut 只删除已证明零消费者的写 façade 和 supporting adapters。Task、Project、Space 的真实写服务及 operation-id 语义保持不变。
- 不恢复普通列表或性能测试产品页面。交互回归使用小规模纯 projection 与现有 Board 测试，真实跟手感继续进入统一产品验收。
- 不新建 CI 系统。bundle、依赖和性能检查作为仓库已有本地/release 门禁的组成部分；未来建立远端 CI 时直接调用同一脚本。

## Testing Decisions

- 凭据脱敏在 runtime 配置边界测试 authority password、查询参数 password、percent-encoding、组合参数和无凭据地址；断言安全输出，不 snapshot 原始 secret。
- 远端绑定在同步 runtime 的最高稳定接缝覆盖：首次绑定、同实例重连、不同实例拒绝、显式 rebind、pending outbox 阻止、两个有重叠/倒序 sequence 的远端不复用 cursor。真实 PostgreSQL contract tests继续使用现有环境门；无数据库环境时明确 ignored，不用 mock 结果冒充真实协议通过。
- 同步轮次测试覆盖 success→failure 和 success→success：每个成功提交的 domain event 都能观察到，最终状态仍准确反映失败或成功。
- 任务详情使用现有 view-model / drawer 行为接缝覆盖切换、关闭按钮、Escape/dismiss、flush=false、重试成功和无 dirty draft 的快速离开。断言 active task、open 状态和草稿，不锁定内部 effect 顺序。
- collection projection 纯测试覆盖 key membership、index、相邻导航、折叠和 selection；Board DOM 测试覆盖 keyboard modality + stale pointer、pointerdown 恢复和非 current action reveal 抑制。
- task-by-id 索引回归以日常规模输入验证单次消费与索引身份，不使用大数据量、绝对耗时或任意 sleep 冒充压测。只有 profiler 证明 context 广播仍是热点时才增加 render-count 测试与订阅拆分。
- Saved View 使用现有页面测试覆盖打开、编辑、删除、键盘与 nested menu 事件隔离，并通过 accessible role/name 查询验证 ListView 语义；不保存大 JSX snapshot。
- release 脚本使用既有 command-runner 接缝覆盖缺 token fail-fast、install 后缺失/错误 artifact、正确命令顺序和日志不含敏感值。至少执行一次可用凭据环境下的 clean detached install；若当前机器没有凭据，将其保留为明确外部发布验证缺口。
- production build 后记录 Main/Launcher 初始传递 JS raw/gzip、低频 overlay chunk 和图片字节数；预算脚本只读取构建产物并在超过明确阈值时失败。
- Lifecycle 删除前以调用方搜索确认写 façade 为零消费者，并补齐 Project 对称行为测试；删除后运行 Rust workspace tests、runtime command tests 和旧符号搜索。
- 每阶段先运行聚焦测试，最终运行根级 `bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、`bun run test:run`、`bun run test:scripts`、`bun run test:release`、`bun run build`、Rust workspace tests、`git diff --check` 与 dependency audit。
- 真机 macOS/Windows、最低 WebView、原生滚动、VoiceOver、缩放、启动 trace、签名与更新包仍按[统一产品验收](../../unified-product-acceptance/spec.md)执行；未运行不写成通过。

## Out of Scope

- 不改变 Task、Project、Space 的产品领域含义、冲突策略或用户可见生命周期规则。
- 不自动合并两个已有远端数据集，不在用户无明确确认时清空本地数据库、outbox 或远端数据。
- 不建立通用 sync transport framework、repository factory、entity service façade 或多实现 plugin architecture。
- 不重新设计 Row anatomy、44px/36px/2px 几何、Accent、字体、圆角或已确认的 current/selected 视觉语言。
- 不引入另一套虚拟列表库、普通列表 fallback、small/large threshold、运行时 feature flag 或双 renderer。
- 不重写 HeroUI、React Aria、TanStack Query/Virtual 或 Vite；只在现有公共能力上修正 StoneFlow 的所有权和配置。
- 不新增包来完成 URL 解析、图片缩放、bundle 统计或简单索引；优先使用已有 crate、构建产物和平台工具。
- 不以这项工程任务替代真实 Main、Launcher、macOS、Windows、最低 WebView、辅助功能、签名包和更新链验收。
- 不顺带清理与上述因果边界无关的全仓代码、文档、依赖或样式。
- 本规格发布到本地 issue tracker，不创建外部 Issue、PR、云端任务，不自动暂存、提交或推送后续实现。

## Further Notes

- 本规格综合前一轮只读审计与当前代码事实，`ready-for-agent` 表示可以直接实施，不表示任一验证已经通过。
- 风险最高的 remote rebind 必须先用测试固定数据不混合的不变量，再改 schema/命令/UI；任何无法确认的既有 remote 状态都选择 fail closed。
- dependency audit 和 HeroUI clean install 可能依赖官方 registry、私有 CDN 与已有凭据。工具不可用时记录外部缺口，不读取或要求用户在对话中提供 secret。
- 实施过程中若发现某个建议没有真实消费者或优化收益，应删除该建议而不是制造结构；若发现会改变领域、迁移或不可恢复数据的未知影响，则暂停对应切片并说明证据。
- 完成后把本任务移入 `.scratch/archive/`；统一产品验收继续保持独立，吸收本轮新增的混合输入、详情保存失败、启动体积与 remote rebind 真机检查项。
