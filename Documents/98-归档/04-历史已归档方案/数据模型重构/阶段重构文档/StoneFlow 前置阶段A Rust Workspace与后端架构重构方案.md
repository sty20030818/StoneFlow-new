> 版本：前置阶段 A 定稿草案
> 范围：仅限 Rust workspace、后端业务代码清理、主应用与 helper 架构重整
> 目标：在进入阶段 0 之前，先把 Rust 后端从旧模型污染状态重置为可长期维护的干净结构
> 前提决策：
> 1. 旧数据库直接作废，不做历史迁移
> 2. 旧业务后端代码允许破坏性清理
> 3. `helper` 先缩减为最小存在形态，当前阶段不继续扩写
> 4. workspace 保留多 crate 方案，但重新定义职责边界

---

## 1. 前置阶段 A 的定位

前置阶段 A 不属于阶段 0。

它是阶段 0 之前的独立准备阶段，只解决一件事：

> 把当前已经被旧数据模型、旧 Focus 语义、旧 Project 树语义污染的 Rust workspace 清干净，并重建成一套适合新模型继续演进的架构骨架。

这一阶段完成后，项目应该从：

```txt
旧业务逻辑还能跑
但边界不干净
crate 职责被旧模型污染
```

切换为：

```txt
旧业务后端已清理
workspace 结构稳定
crate 职责清楚
desktop-app 成为唯一业务真相
helper 缩到最小
阶段 0 可以在干净底座上开始
```

---

## 2. 本阶段明确不做什么

为了避免和阶段 0 混淆，前置阶段 A 明确不做以下内容：

| 不做项 | 说明 |
|---|---|
| 不实现新数据模型业务流程 | 不实现新 Task / View / Settings / Activity 功能 |
| 不做页面重写 | 前端页面不是本阶段重点 |
| 不做 UI 风格调整 | 视觉风格保持不动 |
| 不做 helper 功能扩展 | helper 只保留最小壳 |
| 不做新业务命令全量接回 | 只保留最小可启动后端骨架 |
| 不做旧数据迁移脚本 | 旧库直接作废 |

---

## 3. 当前 workspace 的真实状态

当前 `src-tauri` workspace 不是没有结构，反而已经具备一套比较清楚的骨架。

当前成员大致是：

```txt
crates/core
crates/desktop-app
crates/entity
crates/helper-app
crates/ipc-protocol
crates/migration
helper-bin
```

这说明当前架构有几件事本来就是对的：

1. 主应用和 helper 分成两个运行体；
2. 根 `src-tauri/src/lib.rs` 维持薄壳；
3. helper 通过 IPC 与主应用通信，不直接接数据库；
4. `entity`、`migration`、`ipc-protocol` 已经具备职责拆分意识。

但当前问题也很明显：

1. `core` 已经被旧产品语义污染；
2. `desktop-app` 里缺少真正稳定的 `domain` 分层；
3. 旧数据模型已经渗透到 `entity`、`migration`、`application`、`repositories`、`ipc`；
4. helper 当前虽然方向对，但承担的业务动作仍偏多；
5. 测试虽然集中在主应用里，但缺少独立测试基础设施层。

因此，本阶段不应该推翻“多 crate”方向，而应该：

> 保留当前 workspace 的骨架思路，清洗掉错误语义，并把 crate 边界重新定义干净。

---

## 4. 前置阶段 A 的架构目标

本阶段重构后的目标 workspace 为：

```txt
src-tauri/
  Cargo.toml
  tauri.conf.json
  build.rs
  src/
    main.rs
    lib.rs
  crates/
    core/
    entity/
    migration/
    ipc-protocol/
    desktop-app/
    helper-app/
    test-support/
  helper-bin/
```

这是本阶段建议的最终目标形态。

它保留了你现在喜欢的优点：

1. 运行体分开；
2. 数据持久化结构分开；
3. IPC 协议分开；
4. 共享基础层分开；
5. 测试基础设施也单独收口。

但同时修掉当前最大的隐患：

1. `core` 不再承载产品语义；
2. `desktop-app` 成为唯一业务真相；
3. helper 不再承担业务编排；
4. 顶层 crate 只保留稳定边界，不做过度分裂。

---

## 5. 各 crate 的职责定义

这一部分是本阶段最重要的内容。

### 5.1 `core`

`core` 保留，但重新定义。

新的 `core` 只允许承担：

```txt
技术基础能力
纯工具型值对象
纯时间工具
纯 ID 工具
纯通用错误基础类型
```

`core` 明确禁止承担：

```txt
默认 Space
默认 View
Task 状态流
项目生命周期规则
产品默认 seed
任何 StoneFlow 业务语义
```

换句话说：

> `core` 不是“共享业务常量层”，而是“共享技术基础层”。

这一步是当前 workspace 优化里最关键的一刀。

### 5.2 `entity`

`entity` 保留，但职责收窄为：

```txt
SeaORM 实体定义
relation 定义
数据库持久化结构映射
```

`entity` 不允许承担：

```txt
领域规则
默认值决策
业务 helper
复杂查询编排
产品状态计算
```

也就是说：

> `entity` 只是数据库实体，不是产品领域模型。

### 5.3 `migration`

`migration` 保留，职责定义为：

```txt
数据库 schema baseline
migration 链
索引/外键/约束
```

`migration` 不允许承担：

```txt
业务 seed
运行时逻辑
领域规则
命令调用
```

### 5.4 `ipc-protocol`

`ipc-protocol` 保留，而且这是当前架构里最值得保留的分层之一。

它只允许承担：

```txt
request / response DTO
协议版本
socket naming
协议级错误结构
```

禁止承担：

```txt
数据库模型
领域模型
默认 Space 回退逻辑
搜索/创建业务规则
前端产品语义
```

### 5.5 `desktop-app`

`desktop-app` 是本阶段重构后的唯一业务真相。

职责为：

```txt
主应用 Tauri 入口编排
所有业务领域模型
所有业务规则
所有 usecase / service
数据库访问编排
seed 接入
IPC server 接入
```

这个 crate 内部继续按目录分层，而不是继续往上拆成更多顶层 crate。

推荐内部结构：

```txt
desktop-app/src/
  app/
  domain/
  application/
  infrastructure/
  tests/
  lib.rs
```

其中：

1. `app/` 负责 Tauri glue、commands、state、builder；
2. `domain/` 负责真正的业务模型与纯规则；
3. `application/` 负责用例编排与 service；
4. `infrastructure/` 负责 DB、repo、seed、ipc server、外部适配；
5. `tests/` 放主应用业务测试；
6. `lib.rs` 继续保持对外入口。

### 5.6 `helper-app`

`helper-app` 保留，但在本阶段缩到最小。

职责只允许是：

```txt
快捷键注册
Quick Capture 窗口壳
IPC client
最小用户输入转发
```

明确禁止：

```txt
数据库访问
主业务规则
默认 Space 决策
Task 创建语义
Project / View / Settings 业务知识
```

这意味着：

> helper 在本阶段只是“未来会用到的最小入口壳”，不是业务子系统。

### 5.7 `test-support`

新增 `test-support`。

这个 crate 的职责是：

```txt
测试临时 SQLite 环境
测试路径工具
fixture builder
共用测试断言 helper
```

它不承担业务本身，只承担测试基础设施。

这样做的价值是：

1. 测试工具不再散落在多个 crate；
2. `desktop-app`、`migration`、以后可能存在的其他 crate 可以共享测试基础设施；
3. 测试也有单一职责收口位置。

---

## 6. 为什么不把 domain/application/infrastructure 再拆成顶层 crate

这是本阶段必须主动拒绝的一个方向。

虽然看起来很“企业级”，但在当前阶段不推荐把下面这些做成顶层 crate：

```txt
crates/domain
crates/application
crates/infrastructure
```

原因如下：

1. 当前边界还在重建中，过早拆顶层 crate 容易来回搬迁；
2. 顶层 crate 太多会导致类型传递链过长；
3. 这次前置阶段的目标是“清干净并重建”，不是“做最大化抽象”；
4. 先在 `desktop-app` 内部把分层站稳，后续如果边界真的稳定，再考虑升格成 crate。

因此本阶段的原则是：

> 顶层 crate 只承担稳定边界；
> 主应用内部结构承担业务分层。

---

## 7. 本阶段需要清理的旧代码范围

前置阶段 A 的重点不是“保留多少旧文件”，而是“哪些旧业务语义必须被清除”。

### 7.1 必须清理的旧业务后端内容

本阶段默认清理：

1. 旧数据模型驱动的 `application` usecase；
2. 旧 `repositories.rs` 大一统仓储文件；
3. 旧 `seed`；
4. 旧 `focus_views` 相关主逻辑；
5. 旧 Project 树相关逻辑；
6. 旧围绕 `todo/done` 和 `pinned` 的核心业务假设；
7. 基于旧模型的绝大多数测试。

### 7.2 默认不动的平台壳

本阶段默认保留：

1. 根 `src-tauri` 宿主壳；
2. `tauri.conf.json`；
3. `capabilities`；
4. `build.rs`；
5. `main.rs` 与根 `lib.rs` 的薄入口结构；
6. `helper-bin` 宿主壳。

### 7.3 需要迁移而不是直接平移的内容

以下内容不能原样保留，只能“按新职责迁移”：

1. 旧 `core` 中真正通用的技术基础；
2. 旧 `ipc-protocol` 中仍然有效的纯 DTO；
3. 旧 `desktop-app` 中仍然有效的 Tauri 宿主编排思路；
4. 旧 helper 中“仅属于 helper 壳”的最小部分。

---

## 8. 主应用与 helper 的新边界

前置阶段 A 需要把主应用与 helper 的职责重新写死。

### 8.1 主应用

主应用是唯一业务真相。

主应用负责：

```txt
数据库初始化
迁移
seed
所有领域规则
所有写库动作
所有主业务 command
helper 请求的最终处理
```

### 8.2 helper

helper 只负责输入入口。

helper 负责：

```txt
快捷键
快速捕获壳
最小输入采集
向主应用发送请求
```

helper 不负责：

```txt
数据库
默认 Space 决策
Task 创建规则
任何业务状态持久化
```

因此这条规则要写死：

> helper 只能发“创建意图”，不能拥有“创建规则”。

---

## 9. 前置阶段 A 的执行顺序

本阶段建议按以下顺序执行。

### 9.1 第一步：冻结旧结构扩张

1. 停止继续在旧 `core`、旧 `application`、旧 `repositories` 上叠加逻辑；
2. 明确旧代码进入待清理状态；
3. 不再新增任何旧模型相关测试。

### 9.2 第二步：定稿新 workspace 边界

1. 确认最终 crate 列表；
2. 确认每个 crate 的职责；
3. 确认哪些 crate 迁移、哪些删、哪些新增。

### 9.3 第三步：重组 crate 结构

1. `core` 重定义；
2. `test-support` 新增；
3. `desktop-app` 内部四层重组；
4. helper 收缩。

### 9.4 第四步：清理旧业务后端

1. 清理旧 `application`；
2. 清理旧 `repositories.rs`；
3. 清理旧 seed；
4. 清理旧 Focus / Project tree 语义；
5. 清理旧测试。

### 9.5 第五步：恢复最小可启动骨架

1. 保证主应用可启动；
2. 保证数据库 bootstrap 最小骨架存在；
3. 保证 helper 可作为最小壳存在；
4. 保证后续阶段 0 能继续接手。

---

## 10. 前置阶段 A 的验收标准

本阶段完成后，应满足以下验收。

### 10.1 workspace 结构

```txt
crate 列表已重组完成
crate 职责边界清楚
没有新的职责交叉
```

### 10.2 core

```txt
core 不再承载业务语义
core 只保留技术基础能力
```

### 10.3 desktop-app

```txt
desktop-app 成为唯一业务真相
内部四层目录清楚
旧业务污染已清理
```

### 10.4 helper

```txt
helper 仅保留最小入口壳
helper 不再持有业务规则
helper 不接数据库
```

### 10.5 ipc-protocol

```txt
只保留纯协议 DTO
不带业务编排逻辑
```

### 10.6 测试

```txt
test-support 已建立
旧测试污染已清理
至少具备后续阶段 0 所需的最小测试基建
```

---

## 11. 本阶段完成后的状态定义

前置阶段 A 完成，不代表新数据模型已经落地。

它只代表：

> Rust workspace 已经从“旧业务语义污染状态”，切换到了“边界清楚、职责稳定、适合继续做阶段 0”的状态。

完成后的理想状态应该是：

```txt
workspace 清楚
crate 边界清楚
desktop-app 是唯一业务真相
helper 是最小入口壳
core 已收窄
entity / migration / ipc-protocol 已回归单一职责
阶段 0 可以在这个骨架上继续做新模型底座
```

这就是前置阶段 A 的唯一目标。
