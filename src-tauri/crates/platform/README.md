# stoneflow-platform

Tauri / OS 平台能力封装。

## 职责

- 窗口材质、快捷键、托盘等 OS/Tauri 细节
- 不持有业务状态，不访问数据库

## 禁止依赖

- application / storage / sync / domain 业务规则
