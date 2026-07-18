/**
 * 生命周期叶子页（archive / trash）。
 */
import { LifecycleList } from '@/features/lifecycle'

export function WorkspaceArchivePage() {
	return <LifecycleList mode='archive' />
}

export function WorkspaceTrashPage() {
	return <LifecycleList mode='trash' />
}
