//! 诊断：统计 Temp 中 StoneFlow 测试目录数量。

use stoneflow_test_support::count_stoneflow_test_dirs;

fn main() {
    println!("stoneflow_test_dirs={}", count_stoneflow_test_dirs());
}
