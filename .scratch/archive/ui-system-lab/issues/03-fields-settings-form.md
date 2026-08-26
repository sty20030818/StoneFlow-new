# 03 — 让 Fields 与 Settings Form 完整状态可审查

**What to build:** 让审查者能够操作 StoneFlow 的真实 Field 与选择控件，比较 Pointer Focus、Keyboard Focus Visible、校验和只读等适用状态，并在无业务副作用的最小 Settings Form 中观察表单分组、保存、错误、重试和危险区。

**Blocked by:** 01 — 建立 UI Lab 垂直内核并跑通 Button 双视图样例。

**Status:** completed; archived; manual acceptance transferred

- [x] Fields 可审查面使用真实 Input、Textarea 与 SearchField 覆盖空值、已填值、占位符、清除、禁用、只读、加载、无效、长中文和窄宽度中的适用状态，而不是复制简化输入框。
- [x] NumberField、DateField、Select 与 ComboBox 的已安装、实际可用能力可以真实操作；若某个候选缺少可选 peer，则明确显示依赖要求而不为展示完整性安装依赖或伪造行为。
- [x] Checkbox、Radio、Switch 与 Toggle 展示选中、未选、半选（适用时）、禁用和键盘焦点；Lab fixture 提供可操作的 Label 与非颜色观察线索，真实组件若存在键盘或状态表达缺口则如实暴露并记录，不用 Lab override 掩盖。
- [x] Label、Hint、Required、Invalid 与 Read-only 的适用组合能够观察信息顺序、必填/错误关联和辅助技术结果；真实组件若关联或层级不符合预期，作为审查发现记录，不阻塞观察面交付，也不在本 ticket 顺手修复。
- [x] 审查者可以分别通过指针点击和键盘 Tab 复现 Field 焦点，清楚观察 Pointer Focus 与 Keyboard Focus Visible 的真实差异；Lab 不叠加焦点修饰来伪造通过。
- [x] Settings Form 代表场景以最小真实组合展示表单分组、保存、Pending、错误、重试和危险区，并支持长中文与窄容器审查。
- [x] Settings Form 的交互使用无副作用 fixture，不写入真实设置、不调用 Tauri Command，也不复制第二套业务状态或设置页面实现。
- [x] 复杂 Field 或 Settings 场景只在既有公开 Interface 足以组合时进入 Lab；需要深导入、为 Lab 新增公共 API 或伪造大量应用上下文的内容明确标为“仅真实应用验证”。
- [x] 根级行为测试证明 Fields 与 Settings Form 可搜索、可选择且切换后旧预览卸载；浏览器 smoke 另行验证指针/键盘焦点、校验关联、长中文和窄容器，不以 jsdom 结果代替视觉结论。
