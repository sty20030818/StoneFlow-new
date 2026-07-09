/**
 * Shell 级同步状态：只挂一份 controller，Footer / Sidebar / Chip 共用。
 */

import { createContext, useContext, type ReactNode } from 'react'

import { useSyncStatusController } from '@/features/sync/model/useSyncStatusController'

type SyncStatusValue = ReturnType<typeof useSyncStatusController>

const SyncStatusContext = createContext<SyncStatusValue | null>(null)

export function SyncStatusProvider({ children }: { children: ReactNode }) {
	const value = useSyncStatusController()
	return <SyncStatusContext.Provider value={value}>{children}</SyncStatusContext.Provider>
}

export function useSharedSyncStatus(): SyncStatusValue {
	const ctx = useContext(SyncStatusContext)
	if (!ctx) {
		throw new Error('useSharedSyncStatus must be used within SyncStatusProvider')
	}
	return ctx
}
