//! Helper 重启策略：指数退避 + 熔断器。

use std::time::{Duration, Instant};

const DEFAULT_MAX_RETRIES: u32 = 5;
const DEFAULT_BASE_DELAY_MS: u64 = 1_000;
const DEFAULT_MAX_DELAY_MS: u64 = 30_000;
const DEFAULT_STABLE_WINDOW_MS: u64 = 60_000;

/// 重启策略配置。
#[derive(Debug, Clone)]
pub struct RestartPolicyConfig {
    pub max_retries: u32,
    pub base_delay: Duration,
    pub max_delay: Duration,
    pub stable_window: Duration,
}

impl Default for RestartPolicyConfig {
    fn default() -> Self {
        Self {
            max_retries: DEFAULT_MAX_RETRIES,
            base_delay: Duration::from_millis(DEFAULT_BASE_DELAY_MS),
            max_delay: Duration::from_millis(DEFAULT_MAX_DELAY_MS),
            stable_window: Duration::from_millis(DEFAULT_STABLE_WINDOW_MS),
        }
    }
}

/// 重启策略状态机。
#[derive(Debug)]
pub struct RestartPolicy {
    config: RestartPolicyConfig,
    attempt: u32,
    last_crash_at: Option<Instant>,
    last_restart_at: Option<Instant>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RestartDecision {
    /// 允许重启，返回建议延迟。
    Restart(Duration),
    /// 达到上限，熔断。
    CircuitOpen,
}

#[allow(dead_code)]
impl RestartPolicy {
    pub fn new(config: RestartPolicyConfig) -> Self {
        Self {
            config,
            attempt: 0,
            last_crash_at: None,
            last_restart_at: None,
        }
    }

    /// 记录一次崩溃，返回是否允许重启。
    pub fn record_crash(&mut self) -> RestartDecision {
        let now = Instant::now();

        // 稳定窗口内无崩溃 → 重置计数器
        if let Some(last) = self.last_crash_at {
            if now.duration_since(last) > self.config.stable_window {
                self.attempt = 0;
            }
        }

        self.attempt += 1;
        self.last_crash_at = Some(now);

        if self.attempt > self.config.max_retries {
            return RestartDecision::CircuitOpen;
        }

        let delay = self.calculate_delay();
        RestartDecision::Restart(delay)
    }

    /// 记录一次成功的重启（进程已稳定运行）。
    pub fn record_stable(&mut self) {
        self.last_restart_at = Some(Instant::now());
    }

    /// 手动重置策略状态（用于 CircuitOpen 后手动恢复）。
    pub fn reset(&mut self) {
        self.attempt = 0;
        self.last_crash_at = None;
        self.last_restart_at = None;
    }

    /// 当前尝试次数。
    pub fn attempt(&self) -> u32 {
        self.attempt
    }

    /// 是否处于熔断状态。
    pub fn is_circuit_open(&self) -> bool {
        self.attempt > self.config.max_retries
    }

    fn calculate_delay(&self) -> Duration {
        // 指数退避: base * 2^(attempt-1)，上限 max_delay
        let multiplier = 2_u64.saturating_pow(self.attempt.saturating_sub(1));
        let delay = self.config.base_delay.saturating_mul(multiplier as u32);
        delay.min(self.config.max_delay)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exponential_backoff_within_bounds() {
        let config = RestartPolicyConfig {
            max_retries: 5,
            base_delay: Duration::from_secs(1),
            max_delay: Duration::from_secs(30),
            stable_window: Duration::from_secs(60),
        };
        let mut policy = RestartPolicy::new(config);

        // 第 1 次: 1s
        let d1 = policy.record_crash();
        assert!(matches!(d1, RestartDecision::Restart(d) if d == Duration::from_secs(1)));

        // 第 2 次: 2s
        let d2 = policy.record_crash();
        assert!(matches!(d2, RestartDecision::Restart(d) if d == Duration::from_secs(2)));

        // 第 3 次: 4s
        let d3 = policy.record_crash();
        assert!(matches!(d3, RestartDecision::Restart(d) if d == Duration::from_secs(4)));

        // 第 4 次: 8s
        let d4 = policy.record_crash();
        assert!(matches!(d4, RestartDecision::Restart(d) if d == Duration::from_secs(8)));

        // 第 5 次: 16s
        let d5 = policy.record_crash();
        assert!(matches!(d5, RestartDecision::Restart(d) if d == Duration::from_secs(16)));

        // 第 6 次: 熔断
        let d6 = policy.record_crash();
        assert_eq!(d6, RestartDecision::CircuitOpen);
    }

    #[test]
    fn reset_works() {
        let config = RestartPolicyConfig::default();
        let mut policy = RestartPolicy::new(config);

        policy.record_crash();
        policy.record_crash();
        assert_eq!(policy.attempt(), 2);

        policy.reset();
        assert_eq!(policy.attempt(), 0);
        assert!(!policy.is_circuit_open());
    }
}
