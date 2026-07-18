# M-F-SUBMIT · features/submit

> 日期：2026-07-17  
> 状态：**decided（方案对比 · 小平台标杆）** · **decide-only**  
> 路径：`src/features/submit`（5 文件量级）  
> 类型：**platform**  
> 切分总览：**Keep**（小而精）  
> 关联：command C3 · task/project/space/view 表单 · layout ShellProviders · QC 提交语义  

---

## A. 现网事实

### A.1 一句话

**提交目标注册表**：当前打开的创建/编辑表单向系统登记「我可以被提交」；命令板/快捷键 **Enter / 继续 / 打开** 调 `submitActiveTarget(intent)`，**不**知道具体是任务还是项目表单。

### A.2 结构

```txt
submit/
  model/
    SubmitRegistryProvider.tsx   ~309  store + Provider + hooks
    use-submit-target-from-form.ts  RHF → register target
  index.ts
```

### A.3 能力

| API | 作用 |
|-----|------|
| `SubmitRegistryProvider` | 壳挂载 |
| `useRegisterSubmitTarget` | 表单注册/卸载 |
| `useSubmitRegistryContext/Actions` | 命令侧读 canSubmit*、触发 submit |
| `SubmitIntent` | `default` \| `continue` \| `open` |
| `useSubmitTargetFromForm` | 从 react-hook-form 派生 target |

### A.4 消费者

| 谁 | 角色 |
|----|------|
| layout ShellProviders | 挂 Provider |
| command host / submitSlice | `submitActiveForm` → registry |
| TaskCreateContent / ProjectCreateContent / SpaceEditor / ViewEditor | 注册 target |

### A.5 已做对的（标杆级）

- **选中式注册** 与 selection 同构  
- **无实体业务**；submit 回调在表单自己  
- **无 layout 倒依赖**  
- intent 三态对齐产品（建一条 / 再建 / 建完打开）  
- 用 `useSyncExternalStore` 做稳定快照，避免命令板循环更新（设计用心）  
- 切分：**Keep**，勿并 command  

### A.6 小问题

| 问题 | 说明 |
|------|------|
| Provider 文件 ~309 | 可拆 store 纯模块 vs React |
| source 联合类型 | 已 open string；保持可扩展 |
| QC 未用本 Registry | 独立窗无主壳 Provider；**语义对齐 intent 即可**（Q3），不必硬挂 |
| command 经 layout slice 转发 | C3 后 host 直接调 registry，slice 可删 |

---

## B. 边界争议

| 候选 | 现在 | 目标 |
|------|------|------|
| 注册表 + intents | submit | **Keep 独立 platform** |
| useSubmitTargetFromForm | submit | Keep（表单胶水，非领域） |
| 并入 command | — | **否**（表单页不依赖命令 UI 包） |
| 并入 shared/form | — | 可选；Provider 生命周期偏 app 壳，**现 Keep feature** |
| 业务 validate | 表单/schema | **不在 submit** |

---

## C. 多方案对比

### 方案 U1 · 巩固现网（**基线即接近最优**）

仅拆文件、C3 去掉 submitSlice 间接层。

| 优点 | 缺点 |
|------|------|
| 已是标杆 | 无大缺点 |

**结论：** 与 U2 结合。

---

### 方案 U2 · Keep + 纯化文档 + Host 直连（**推荐**）

```txt
submit = 注册协议 + Provider + form helper
command host = submitRegistryActions.submitActiveTarget
表单 = useSubmitTargetFromForm / registerTarget
QC = 本地实现 continue/open 语义，或可选轻量 register（若未来共窗）
```

| 优点 | 缺点 |
|------|------|
| 边界稳、可删 | 无 |

**结论：最优（小改）。**

---

### 方案 U3 · 并入 command

| 优点 | 缺点 |
|------|------|
| 少包 | command 更胖；无命令时表单仍要提交注册 |

**结论：否。**

---

### 方案 U4 · 并入 shared/form

| 优点 | 缺点 |
|------|------|
| 靠近 RHF | shared 出现壳级 Provider；与「shared 无装配」略冲 |

**结论：不优先。**

---

### 方案 U5 · 取消平台，命令直接调表单 ref

| 优点 | 缺点 |
|------|------|
| 少抽象 | 多表单争用 Enter；历史倒车 |

**结论：否。**

---

## D. 推荐 = **U2**

### D.1 职责

| 负责 | 不负责 |
|------|--------|
| 当前可提交 target 注册表 | 校验规则、mutation |
| default/continue/open 意图分发 | 打开哪个对话框 |
| 与命令系统的端口 | 命令菜单 UI |

### D.2 协作

```txt
ShellProviders → SubmitRegistryProvider
TaskCreate / ProjectCreate / SpaceEditor / ViewEditor
  → register SubmitTarget { submit(intent), canSubmit, … }

Command「保存/提交」
  → submitActiveTarget('default'|'continue'|'open')

C3 后：register 在域表单；host 只调 submit public
QC：对齐 intent 语义；独立窗可不挂主 Registry
```

### D.3 与已定模块

| 模块 | 关系 |
|------|------|
| **command C3** | 删除业务式 submit 实现；只调 registry |
| **task/QC 创建内核** | 表单 submit(intent) 实现落内核；register 在宿主 |
| **selection** | 正交（选中实体 vs 提交表单） |
| **切分** | Keep 小平台 |

### D.4 public

已足够小：Provider 四件套 + types + useSubmitTargetFromForm。  
可拆：`createSubmitRegistryStore` 到独立 ts 降 Provider 行数。

---

## E. 最佳实践

**Do**

- 一表单一 target；关对话框 clear  
- intent 语义全产品统一  
- canSubmit / disabledReason 给命令板展示  
- 稳定 snapshot，避免菜单重挂载风暴  

**Don't**

- 在 submit 里调 createTask api  
- 多个 target 无 priority 抢 active  
- QC 强依赖主壳 Provider 树  

---

## F. 迁移刀序

| 序 | 刀 |
|----|-----|
| 1 | 文档钉死为标杆平台 |
| 2 | C3：host 直连，删 submitSlice 业务感 |
| 3 | （可选）store 与 Provider 拆文件 |
| 4 | QC intent 语义对照表（与 create 内核一起） |

---

## G. 方案小结

| 方案 | 荐 |
|------|-----|
| **U1/U2 Keep 纯化** | **✅** |
| U3 并 command | ❌ |
| U4 并 shared/form | 不优先 |
| U5 取消 | ❌ |

---

## H. 决议

| # | 决议 |
|---|------|
| 1 | **Keep** submit；切分正确 |
| 2 | 目标 **U2**；接近已最优，只补 Host 直连与文档 |
| 3 | 不并 command；QC 语义对齐不硬挂 |
| 4 | decide-only |

### 开放问题

- [ ] `supportedIntents` 是否强制三态都声明（推荐表单显式）  
- [ ] 嵌套 Dialog 多 target 时 priority 规则是否要产品说明  

---

## I. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：标杆判定、U1–U5、推荐 U2 |
