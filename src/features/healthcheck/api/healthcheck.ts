import { invoke } from '@tauri-apps/api/core'

type HealthcheckResponse = {
  status: 'ok' | 'degraded'
  app: string
  database_path: string
  database_ready: boolean
}

export type HealthcheckPayload = {
  status: 'ok' | 'degraded'
  app: string
  databasePath: string
  databaseReady: boolean
}

/**
 * 向 Rust 宿主请求当前最小健康状态。
 */
export async function fetchHealthcheck() {
  const payload = await invoke<HealthcheckResponse>('healthcheck')

  return {
    status: payload.status,
    app: payload.app,
    databasePath: payload.database_path,
    databaseReady: payload.database_ready,
  } satisfies HealthcheckPayload
}
