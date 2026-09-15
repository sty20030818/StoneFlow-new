# 02: 恢复创建编辑工作面与日期渐进展示

**What to build:** 用户在 Task / Project 创建弹窗中获得统一的无装饰编辑工作面；Task 的三个日期未设置时收在更多菜单，设置后在属性栏出现独立胶囊，修改与清除均可通过胶囊或菜单完成。完整覆盖输入、属性、提交与键盘路径，并保持其他页面的视觉与行为不变。

**Blocked by:** 01: 创建归属与提交反馈收口。先使用任务 01 确定的 Header / 表单组合和归属合同，再实现视觉与日期交互，不为旧接线保留临时兼容层。

**Status:** implemented; archived; remaining acceptance transferred

- [x] Task 与 Project 继续共用既有创建外壳和内容槽位，不另建第三套 Composer、通用表单引擎或平行基础控件库。
- [x] 普通创建弹窗实际圆角为 24px、白色浮层，桌面最大宽度 768px 并采用偏上方定位；窄窗保留安全边距，短窗口不因固定留白遮挡操作区。
- [x] 内容内边距与表单分区为 spacing 3（12px），Header 分隔符两侧与属性间隔为 spacing 1.5（6px）；标题、描述左侧额外缩进 4px，描述空态为三行 60px。Project 不渲染无内容的属性占位。
- [x] 共享底栏最左侧提供禁用的圆形素材图标按钮，仅占位，不触发上传或表单提交，保留反馈及提交控件。
- [x] 标题采用现有字体 18px / 600，描述 14px / 400；沿用现有语义颜色和 Accent，不引入新字体、色板或独立样式系统。
- [ ] 标题与描述在默认、hover、focus、focus-visible 下均无边框、背景填充、阴影和 ring；可访问名称、可见光标、错误信息及输入语义保留，按钮 / 菜单键盘焦点与强制颜色可辨识性不被移除。
- [x] 24px 与透明输入只属于创建场景的窄语义合同，通过现有集中样式所有者落实；其他表单及通用 Overlay 12px 不改变，不从工具类名推断实际圆角。
- [x] 长描述增长到上限后只有一个实际滚动区域；标题、属性与提交操作始终可达，窄窗属性可换行；Task 现有放大呈现保留输入，不为 Project 新增放大功能。
- [x] Task 无日期时，属性栏仅显示状态、优先级、归属和末尾更多按钮；更多菜单提供截止、计划、提醒三个设置入口，不渲染空胶囊或额外已设置标记。
- [x] 设置任一日期后，更多按钮前立即出现该日期胶囊；一至三个胶囊均可显示，顺序固定为截止、计划、提醒，不受设置顺序影响。
- [x] 胶囊与更多菜单共享同一日期值及编辑能力；已设置字段的菜单文案变为更改相应时间，并显示当前值。两个入口修改后同步更新胶囊、菜单和实际提交值。
- [x] 清除仅移除对应日期值和胶囊，菜单恢复设置入口；取消日期选择保留原值；三个字段互不覆盖或串扰。
- [x] 复用现有预设、自定义日期、格式化、图标和清除能力，胶囊可辨识截止 / 计划 / 提醒含义；不改变本地日历日期合同，不增加小时分钟、时区或提醒调度。
- [x] 键盘可进入更多和日期选择器；Escape / 取消只退出最上层且保留创建内容，返回有效触发器；清除导致胶囊卸载时焦点回到更多按钮。
- [ ] 任务 01 的空间同源、错误恢复、一次性创建更多和各类提交导航回归通过；日期修改不得造成意外表单提交，中文 IME 选词不得误触提交。
- [x] 在同一完整创建组合接缝补日期设置 / 修改 / 清除 / 取消及最终 payload 的日常行为测试，三个日期参数化并补组合场景；不另造日期状态机测试框架或实体压测。
- [x] 复用已有日期和 Overlay 基础测试，不重复复制；替换仅锁定旧 padding 等实现细节的过时断言，以行为及真实布局证据验证新合同。
- [ ] 对空表单、短 / 长描述、日期胶囊、错误、pending、窄窗和不同 Accent 完成实际界面检查，记录 24px、输入各状态、对齐、单滚动和底栏可达的证据；目录登记或静态模拟图不充当生产组合验收。
- [ ] 对可用真实 Tauri Main 记录中文输入法、既有快捷键、逐层 Escape、日期返回焦点及 Task 放大切换结果；未执行平台与原生步骤明确保留为未验证，不以 jsdom 或浏览器结果替代。
- [x] 删除本次因果范围内无消费者的旧创建样式、空占位、重复日期展示 / 接线和兼容出口；不恢复旧 base / patterns，不重写 Launcher，不向 Project 创建增加日期字段，不加入草稿或关闭保护。
- [x] 同步现行界面系统、样式架构与相关 ADR 的创建场景语义例外，保持集中 Owner 和其他控件合同；不修改冻结归档或额外建立平行规范。
- [x] 运行项目根级适用门禁和相关测试，分别交付自动化、真实界面及桌面证据；不主动启动长期服务、不操作正式数据库、不自动提交或推送。

## 实施与证据（2026-09-08）

### 已落实

- 复用 CreateDialogShell / CreateModalContent；新增日期属性组合，日期菜单与胶囊共用原日期 action spec 和菜单内容，不留重复预设计算或日期状态副本。
- 创建场景集中语义样式提供 24px 外壳与透明输入；没有更改普通 Overlay 12px 或其他字段的皮肤。Project 不渲染空属性区。
- 描述复用同一自动高度测量路径，由外层 viewport 唯一滚动；不保留 CSS / JS 两套兼容分支。
- 修复自定义日期打开时清掉父创建状态的根因；Shell Escape 优先退出日期层。清除胶囊后焦点回到更多。
- UI Lab 第十五批「创建弹窗 · 真实组合」使用真实生产组合，支持跨 Space、模拟失败与 1.2 秒 pending；检测到原生 Tauri 时拒绝安装 mock。只开放两条精确 Layout 审计入口，没有放宽整个依赖边界。

### 首轮浏览器实测（旧几何，后续密度调整见下方）

使用既有 localhost:5173 服务，页面标题核对为 StoneFlow UI Lab；只模拟内存 IPC，未操作正式数据库。默认视口 1280×720，另检查 390×500，检查后已恢复视口。

| 检查 | 实际结果 |
| --- | --- |
| 普通外壳 | 白色，计算圆角 16px、宽 768px、顶部 72px、四侧 padding 24px |
| 对齐与字号 | Header / 标题 / 描述左边均为 x=281px；标题 18px / 600，描述 14px / 400 |
| 输入交互态 | 默认、hover、focus / focus-visible 下 background 透明、border 0、shadow none、outline-style none；标题 / 描述可访问名称与光标保留 |
| 长描述 | 35 行增长至 39 行后 textarea 高度与 scrollHeight 均为 780px、自身 scrollTop=0；外层高 386px、scrollTop=392px。连续换行光标可见，标题 / 属性 / 底栏可达 |
| 窄窗 | 390×500 时外壳宽 358px、左右各 16px；三个日期按截止 / 计划 / 提醒换行显示，长描述仍能滚动且提交按钮可见 |
| Task 放大 | 宽 1152px，标题与 730 字符描述保留；退出放大不重置内容 |
| 日期闭环 | 更多菜单设置后出现对应胶囊；菜单变为更改并显示当前值；三个日期独立显示，清除只移除目标胶囊且焦点回到更多 |
| 日期叠层 | 自定义计划日期按 Escape 后只关闭日期弹窗，父标题仍在、焦点回到更多；取消未改变已有日期 |
| 错误与 pending | Project 错误在底栏显示且输入 / 开关保留；重试成功复位；pending 显示创建中并禁用 Space、开关、提交，底栏可见 |

### 未执行的验收边界

- 真实 Tauri Main 的 C / N P 与完整 Command 宿主、中文 IME 选词、原生逐层 Escape、日期返回焦点和放大切换未执行。
- 其他 Accent 与系统强制颜色未做实际界面检查；强制颜色保留 Highlight 焦点的 CSS 已落实，但不能写成实测通过。
- 因这些步骤未完成，相关混合验收项保持未勾选，UI Lab 批次保持 pending，工作包不归档。

### 自动化与构建

- `bun run test:run --maxWorkers=2`：202 个文件、1048 项测试全部通过，191.42 秒。没有修改项目并发配置、测试超时或弱化断言。
- `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、`bun run check:animations` 通过；lint 保留仓库其他模块的既有警告，本轮创建相关文件无警告。
- `bun run test:scripts`：178 项通过；`bun run test:rust`：254 项通过、12 项既有 ignored，不计入已通过数量。
- `bun run build` 通过，包括 `check:bundle`。没有新增依赖或修改锁文件。
- 首次默认并发的 `bun run check` 在测试阶段失败：1 项目录漏登记、9 项 5 秒超时及 1 项 Launcher 异步内容查询失败。目录登记已按既有批次合同修正；其余失败在未改断言 / 超时的聚焦复验和最终完整复验均通过。不能把首次整条命令写成通过。
- 修改保持未暂存；未提交、推送、归档，也未启动新开发服务。

### 后续密度调整与复验（2026-09-08）

用户明确更新视觉要求后，当前实现改为 24px 圆角、spacing 3（12px）内边距与分区 / 属性间距，移除普通弹窗固定最小高度、重复 padding，描述空态由 80px 收紧为两行 40px。创建属性均使用原生 outline；其他页面的默认 / row-icon 外观不变。标题删空的实时提示取消，但空标题仍不得写入。

- 默认 1280×720 浏览器实测 Task 空态外壳为 768×234px、圆角 24px、padding 12px；Header / 标题 / 描述左边同为 x=269px，Header 与分区间距均为 12px。
- 状态 / 优先级 / 归属 / 更多及已设置截止日期均使用 button--outline、实际 1px 边框。描述边界计算圆角为 0、cursor 为 text，截图中贴边光标为完整竖线。
- 原生键盘 Backspace 删空任务标题后无红字或 invalid 提示，创建按钮禁用。新增自动化先红后绿，并验证强制提交空表单不会写入、重新填写仍可创建。
- 24 行描述加换行后 textarea 高与 scrollHeight 同为 500px、自身 scrollTop=0，外层高 438px 且可滚动。390×420 窄短窗口中属性可换行、外壳边界为 y=42～404、提交按钮 y=363～391，未被裁切；检查后已恢复视口。
- 7 个相关测试文件共 51 项通过；根 typecheck、lint、lint:boundaries、format:check、check:animations 通过。仍未执行的原生 / 主题边界不因本轮浏览器检查而勾选。
- `bun run build`（含包体积门禁）通过；Project 空态也实测为 768×194px、圆角 24px、padding 12px，没有空属性占位。本轮未暂存或提交。

### 间距与素材占位微调复验（2026-09-08）

- 根据后续反馈，Header 分隔符两侧及属性间隔改为 6px，标题、描述左侧额外缩进 4px，描述空态增至三行 60px；容器内边距与分区纵向间隔仍为 12px。
- 共享 Footer 左侧新增原生 outline 圆形素材按钮，禁用且 `type="button"`，不增加素材处理逻辑。回归先因按钮缺失变红，接入后验证可访问名称、禁用、非提交语义及原反馈 / 提交控件均保留。
- 现有 UI Lab 的真实创建组合（隔离内存 IPC）在 1280×720 浏览器中实测：Task / Project 空态分别为 768×254px / 768×214px；两类描述均高 60px、输入起始 padding 为 4px；Header 和 Task 属性 gap 均为 6px，素材按钮位于底栏首位、实际 28×28px、圆角 9999px 且禁用。
- 7 个聚焦文件共 52 项测试通过；根级 `typecheck`、`lint`、`lint:boundaries`、`format:check`、`check:animations` 及 `git diff --check` 通过。lint 仍有创建模块之外的既有警告。本次未重跑构建、窄窗或原生 Tauri 验收；上方既有证据不视为本次复验。未暂存、提交或访问正式数据库。

### Tab 循环与焦点边复验（2026-09-08）

- 真实创建组合复现：Tab 到状态时外扩 2px ring 被内层框架裁切；到创建按钮后继续 Tab 仍停在原按钮。修复内层多余 `overflow-hidden`，保留外壳裁切与描述单滚动。
- 两层传播拦截分别定位：创建壳 blanket keydown 拦截挡住 FocusScope 的 document 监听；Tooltip 的 DOM 键盘 handler 克隆进 HeroUI Button 后再次经过 React Aria `useKeyboard`，默认停止传播。创建壳放行 Tab，共享 Tooltip 先允许传播再运行原 handler，子控件仍可明确消费事件，不新增手动焦点循环。
- 首尾回绕回归先红后绿；末控件必须是真实 HeroUI Button + ActionTooltip，不能只用 native button 代替。另验证 Tooltip 的 Tab 到达父级，子按钮消费 ArrowDown 后不再传播。
- UI Lab 真实创建组合（隔离内存 IPC）验证：Task 按创建任务 → Space → 全屏 → 关闭 → 标题 → 描述 → 属性 → 创建更多 → 创建任务循环；Shift+Tab 从 Space 回创建任务。Project 的提交与 Space 也能双向回绕。
- 状态按钮稳定态 box-shadow 实测为 1px，距离保留裁切的外壳边界 13px，左侧完整显示；Pro CellSelect 的实际焦点 ring 同样消费 1px token。普通焦点由全局 token 统一，invalid 与 forced-colors 规则不减弱；强制颜色本次仅做源码/编译检查，未作真实系统验收。
- 10 个聚焦文件共 75 项测试通过；根级构建及包体积门禁、lint（仍有既有警告）、边界、格式、动画扫描与 diff 检查通过。浏览器证据不替代原生 Tauri 验收。
- 定位数值本次未改变：上边距为 `clamp(1rem, 10dvh, 6rem)`，1280×720 下为 72px。用户询问下移参数，建议改为 `clamp(1rem, 14dvh, 8rem)`，并同步 max-height 的对应扣减；尚未执行下移。未暂存或提交。

### 上下安全边距复验（2026-09-08）

- 用户随后确认下移，并要求底部提前限制增长。创建容器以一个 `--create-dialog-block-gap: clamp(1rem, 14dvh, 8rem)` 同时驱动上下 padding 与 Dialog 最大高度；Task 放大填满同一可用高度，不再独立固定 `70dvh`。
- 1280×720 的隔离内存 UI Lab 实测：30 行描述下，Task 普通、Task 放大、Project 外壳均高约 518.39px，上边距约 100.80px、下边距约 100.81px；Task 描述 viewport 324px、Project 364px，内容均 600px，Dialog 本身无额外滚动。Task 放大宽 1152px，保留原输入和底栏。
- 5 个聚焦文件共 36 项测试通过；类型、边界、格式、动画扫描与 diff 检查通过。本次未重跑构建或原生 WebView / 窄窗验收，未暂存或提交。
- Tooltip 在键盘 focus 自动打开属于库默认行为，`trigger="hover"` 仍包括 focus；已询问用户仅关闭创建场景还是全局关闭。未修改提示策略，不使用私有 API 或删除内部 focus handler 规避。

### 动作提示触发策略（2026-09-08）

- 用户确认 Tab 只聚焦、鼠标悬停才显示动作提示。在共享 `ActionTooltip` 修复，覆盖创建及所有 `CommandActionTooltip` 消费者；不逐按钮打补丁，也不改变焦点环或 Tab 顺序。
- Trigger 子组件通过公开 `TooltipTriggerStateContext` 读取 HeroUI 唯一状态，并由 `useHover` 驱动；Root 关闭自带 focus 触发，保留库内延迟、关闭、受控 API 与键盘传播。不新增计时器、全局 modality 监听或第二套 Tooltip 状态。
- 特意保留含独占禁用原因的 `DisabledActionTooltip` 键盘解释入口；不可 Tab 的 `OverflowTooltip`、直接 HeroUI 和 Pro Sidebar 自带提示不作本轮改造，不声称全产品提示已统一。
- 现有 UI Lab 隔离内存真实组合验证：Task / Project 完整 Tab 循环均无 Tooltip，提交后能回 Space，Task 继续到全屏、关闭、标题。鼠标触发与离开、Tab 后重新 hover、已打开后按 Tab 关闭有自动化覆盖；浏览器接口不提供独立 hover 操作，未把单测描述为真实鼠标或原生 Tauri 验收。
- API 依据：[React Aria useHover](https://react-aria.adobe.com/useHover)、[Tooltip 状态合同](https://react-aria.adobe.com/Tooltip/useTooltipTriggerState)，并核对已安装 HeroUI / React Aria 源码及公开 exports。
- 聚焦回归 9 文件 / 65 项通过，包含 500ms 等待期间 Tab 取消、已打开后 Tab / Escape 关闭、提示本体悬停接续与 200ms 延迟关闭。项目空标题测试同步新合同：禁用提交仍可聚焦但不弹提示，鼠标悬停仍展示快捷键，未删除原内容断言。
- 根级 `typecheck`、`lint`、`lint:boundaries`、`format:check`、`check:animations`、构建与包体积门禁、`git diff --check` 通过；lint / 构建仍有既有第三方与非本轮模块警告。未暂存、提交或访问正式数据库。

### 禁用创建按钮的空 Tab 停靠（2026-09-08）

- 实测空标题路径为“更多属性 → 创建更多 → 无 ring 的禁用 Tooltip 包装层 → Space”。“创建更多”开关的 control 实际已有 1px 焦点环，问题来自 `DisabledCommandActionTooltip` 包装层固定 `tabIndex=0`，不是 Switch 或 FocusScope。
- 包装层支持 `tabIndex`，任务 / 项目创建传 `-1`，仅退出顺序导航、保留悬停快捷键；默认仍为 `0`，不改批量操作可能承载禁用原因的解释入口，也不新增焦点循环或样式补丁。
- 项目创建集成测试与共享提示测试均先因实际 `tabindex=0` 变红，修复后通过。现有 UI Lab 隔离内存真实组合验证 Task / Project：空标题时“创建更多 ↔ Space”；有效标题时“创建更多 → 创建按钮 ↔ Space”，正反方向没有空停。
- 本轮聚焦测试、类型、边界、格式、lint 与 diff 检查通过；lint 保留既有警告。未重跑构建或原生 Tauri 验收，未暂存、提交或访问正式数据库。
