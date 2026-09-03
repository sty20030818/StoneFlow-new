# TaskBoard 列表引擎 macOS 实测记录

## 运行身份

- Commit：`16c7ebd00122a73245fd281ae98877656cde556f`
- Production app：`StoneFlow Task Board Benchmark.app`
- 设备：MacBook Air (Mac17,3)，Apple M5 10 核，16 GB
- OS / WebView：macOS 27.0 (26A5425a)，WKWebView / WebKit 22625.1.29.11.26
- Board viewport：1280 × 751；seed：20260812
- 最低支持 WebView：未定义，因此本记录不是最低版本平台完成证据
- JSON：`task-board-benchmark-macos-16c7ebd0.json`
- JSON SHA-256：`47afbdad55bc3e11fa4fcf5529f9346ff125ac6b5b99a7280853aaf95f5cfb7e`
- 失败记录：`task-board-benchmark-macos-16c7ebd0-failures.json`
- 失败记录 SHA-256：`f5ab1883f60f3e7e3a58dd7f799e36d36be4863f9e34e79da4d0f69d27ba9ac1`
- App executable SHA-256：`954a0329d30add15aa9356192606ebc2983530cbe1359a81959ed4d353e74a02`

## 可重复 runner 结果

| 场景 | virtual mounted / DOM peak | ordinary mounted / DOM peak | focus / keyboard |
| --- | ---: | ---: | --- |
| loaded 150 | 30 / 1,441 | 150 / 6,913 | 两者通过 |
| loaded 300 | 30 / 1,485 | 300 / 13,693 | 两者通过 |
| loaded 600 | 30 / 1,486 | 600 / 27,263 | 两者通过 |
| loaded 2,000 | 30 / 1,487 | 连续两次绘制门禁失败 | virtual 通过 |
| loaded 10,000 | 30 / 1,486 | 按停止规则不再运行 | virtual 通过 |
| paged 150 → 600 | 30 / 1,485 | 按停止规则不再运行 | virtual 通过 |

分页 virtual 记录到第 2 页注入失败并成功重试一次：4 次请求、0 次重复请求，最终 `exhausted`，加载 600 条。

## ordinary 失败与停止规则

在与 `loaded:2000 / virtual` 相同的 commit、进程、设备、环境元数据和 viewport 下，ordinary 连续两次显示：

> 等待双帧绘制超过 5000ms（visibility=visible，focus=true），本次结果已丢弃

两次无差异诊断已按原样转录到独立失败记录，来源明确标为 production benchmark UI 的 accessibility status；runner 按门禁设计不把失败尝试写入 `results`，所以最终 JSON 有 9 条成功结果，失败尝试不能伪装成成功样本。阶段契约规定 ordinary 在同场景可复现失败、virtual 通过后停止剩余 ordinary 场景，因此没有继续制造 10,000 行与分页 ordinary 样本。

## 证据边界与结论

- 当前 macOS 结果足以淘汰 ordinary candidate：它在 2,000 个富 Row 已稳定违反绘制门禁，且 DOM 规模在 600 行时已是 virtual 的约 18.3 倍。
- 程序化滚动与键盘事件只提供可重复辅助证据，不等同于原生触控板 fling、反向 fling、滚动条拖拽、用户跟手感或平台 trace。
- Windows WebView2、两平台最低支持 WebView、进程内存长时曲线、profiling build React commits 和真实产品返回焦点仍是外部验收边界；缺失项不阻止已失败候选的 hard cut，也不能写成已通过。
