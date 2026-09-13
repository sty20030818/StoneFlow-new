//! 成员筛选与窗口排序共用的精确 UTC 时间键。

use sea_orm::sea_query::{Expr, SimpleExpr};

pub(super) fn sqlite_date_expression(value: SimpleExpr) -> SimpleExpr {
    // SQLite 日期函数会舍入毫秒。只让它换算 UTC 分钟，再拼回秒与九位小数，
    // 保留 chrono 写入的纳秒、闰秒和 NULL；行与 cursor 使用完全相同的键。
    const SQL: &str = "strftime('%Y-%m-%dT%H:%M:', substr(?, 1, 17) || '00' || CASE WHEN substr(?, -1) IN ('Z', 'z') THEN 'Z' ELSE substr(?, -6) END) || substr(?, 18, 2) || '.' || substr((CASE WHEN substr(?, 20, 1) = '.' THEN substr(?, 21, length(?) - 20 - CASE WHEN substr(?, -1) IN ('Z', 'z') THEN 1 ELSE 6 END) ELSE '' END) || '000000000', 1, 9)";
    Expr::cust_with_exprs(SQL, vec![value; SQL.matches('?').count()])
}
