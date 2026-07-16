import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type PropsWithChildren,
} from 'react'

import {
	buildDangerConfirmCopy,
	type DangerConfirmCopy,
	type DangerConfirmRequest,
} from '@/features/danger-confirm/model/dangerConfirm'
import { DangerConfirmDialog } from '@/features/danger-confirm/components/DangerConfirmDialog'

type PendingDangerConfirm = {
	request: DangerConfirmRequest
	copy: DangerConfirmCopy
}

type DangerConfirmContextValue = {
	requestDangerConfirm: (request: DangerConfirmRequest) => Promise<boolean>
}

const DangerConfirmContext = createContext<DangerConfirmContextValue | null>(null)

export function DangerConfirmProvider({ children }: PropsWithChildren) {
	const [pendingConfirm, setPendingConfirm] = useState<PendingDangerConfirm | null>(null)
	const resolverRef = useRef<((confirmed: boolean) => void) | null>(null)

	const requestDangerConfirm = useCallback((request: DangerConfirmRequest) => {
		resolverRef.current?.(false)
		setPendingConfirm({
			request,
			copy: buildDangerConfirmCopy(request),
		})

		return new Promise<boolean>((resolve) => {
			resolverRef.current = resolve
		})
	}, [])

	const resolvePendingConfirm = useCallback((confirmed: boolean) => {
		const resolver = resolverRef.current
		resolverRef.current = null
		setPendingConfirm(null)
		resolver?.(confirmed)
	}, [])

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				resolvePendingConfirm(false)
			}
		},
		[resolvePendingConfirm],
	)

	useEffect(
		() => () => {
			resolverRef.current?.(false)
			resolverRef.current = null
		},
		[],
	)

	const value = useMemo<DangerConfirmContextValue>(
		() => ({
			requestDangerConfirm,
		}),
		[requestDangerConfirm],
	)

	return (
		<DangerConfirmContext.Provider value={value}>
			{children}
			<DangerConfirmDialog
				copy={pendingConfirm?.copy ?? null}
				onCancel={() => resolvePendingConfirm(false)}
				onConfirm={() => resolvePendingConfirm(true)}
				onOpenChange={handleOpenChange}
				open={pendingConfirm !== null}
			/>
		</DangerConfirmContext.Provider>
	)
}

export function useDangerConfirm() {
	const context = useContext(DangerConfirmContext)
	if (!context) {
		throw new Error('useDangerConfirm must be used inside DangerConfirmProvider')
	}
	return context
}
