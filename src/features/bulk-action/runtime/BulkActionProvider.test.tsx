import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

import {
	BulkActionProvider,
	useBulkActionContext,
} from '@/features/bulk-action/runtime/BulkActionProvider'
import {
	createBulkActionResult,
	createBulkSelectionSnapshot,
	type BulkAction,
	type BulkActionId,
	type BulkActionResult,
	type BulkSelectionSnapshot,
} from '@/features/bulk-action/core'

const snapshot = createBulkSelectionSnapshot({
	entity: 'task',
	ids: ['task-a'],
	source: 'command-menu',
	createdAt: 1,
})

describe('BulkActionProvider', () => {
	it('不需要确认的 fake action 会执行并返回 success', async () => {
		const run = vi.fn<(nextSnapshot: BulkSelectionSnapshot) => Promise<BulkActionResult>>(
			(nextSnapshot) =>
				Promise.resolve(
					createBulkActionResult({
						status: 'success',
						actionId: 'task.success',
						snapshot: nextSnapshot,
						succeededIds: nextSnapshot.ids,
					}),
				),
		)
		const action = createAction('task.success', { run })

		render(
			<BulkActionProvider actions={[action]}>
				<ProviderProbe actionId={action.id} snapshot={snapshot} />
			</BulkActionProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: '执行批量操作' }))

		await waitFor(() => {
			expect(screen.getByTestId('result-status')).toHaveTextContent('success')
		})
		expect(run).toHaveBeenCalledWith(snapshot, {})
	})

	it('requiresConfirm 的 action 不会立即执行', async () => {
		const run = vi.fn<(nextSnapshot: BulkSelectionSnapshot) => Promise<BulkActionResult>>(
			(nextSnapshot) =>
				Promise.resolve(
					createBulkActionResult({
						status: 'success',
						actionId: 'task.confirm',
						snapshot: nextSnapshot,
					}),
				),
		)
		const action = createAction('task.confirm', {
			requiresConfirm: true,
			getConfirmCopy: () => ({
				title: '确认测试',
				description: '确认描述',
				confirmLabel: '确认执行',
			}),
			run,
		})

		render(
			<BulkActionProvider actions={[action]}>
				<ProviderProbe actionId={action.id} snapshot={snapshot} />
			</BulkActionProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: '执行批量操作' }))

		expect(await screen.findByTestId('pending-title')).toHaveTextContent('确认测试')
		expect(run).not.toHaveBeenCalled()
	})

	it('confirm 后执行原 snapshot', async () => {
		const run = vi.fn<(nextSnapshot: BulkSelectionSnapshot) => Promise<BulkActionResult>>(
			(nextSnapshot) =>
				Promise.resolve(
					createBulkActionResult({
						status: 'success',
						actionId: 'task.confirm',
						snapshot: nextSnapshot,
						succeededIds: nextSnapshot.ids,
					}),
				),
		)
		const action = createAction('task.confirm', {
			requiresConfirm: true,
			run,
		})

		render(
			<BulkActionProvider actions={[action]}>
				<ProviderProbe actionId={action.id} snapshot={snapshot} />
			</BulkActionProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: '执行批量操作' }))
		await screen.findByTestId('pending-title')
		fireEvent.click(screen.getByRole('button', { name: '确认挂起操作' }))

		await waitFor(() => {
			expect(screen.getByTestId('result-status')).toHaveTextContent('success')
		})
		expect(run).toHaveBeenCalledWith(snapshot, {})
	})

	it('cancel 后返回 cancelled', async () => {
		const run = vi.fn<(nextSnapshot: BulkSelectionSnapshot) => Promise<BulkActionResult>>(
			(nextSnapshot) =>
				Promise.resolve(
					createBulkActionResult({
						status: 'success',
						actionId: 'task.cancel',
						snapshot: nextSnapshot,
					}),
				),
		)
		const action = createAction('task.cancel', {
			requiresConfirm: true,
			run,
		})

		render(
			<BulkActionProvider actions={[action]}>
				<ProviderProbe actionId={action.id} snapshot={snapshot} />
			</BulkActionProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: '执行批量操作' }))
		await screen.findByTestId('pending-title')
		fireEvent.click(screen.getByRole('button', { name: '取消挂起操作' }))

		await waitFor(() => {
			expect(screen.getByTestId('result-status')).toHaveTextContent('cancelled')
		})
		expect(run).not.toHaveBeenCalled()
	})

	it('action 抛错时返回 failed，不让错误穿透到 UI', async () => {
		const error = new Error('boom')
		const onResult = vi.fn<(result: BulkActionResult) => void>()
		const action = createAction('task.failed', {
			run: () => {
				throw error
			},
		})

		render(
			<BulkActionProvider actions={[action]} onResult={onResult}>
				<ProviderProbe actionId={action.id} snapshot={snapshot} />
			</BulkActionProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: '执行批量操作' }))

		await waitFor(() => {
			expect(screen.getByTestId('result-status')).toHaveTextContent('failed')
		})
		expect(onResult).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'failed',
				error,
			}),
		)
	})
})

function ProviderProbe({
	actionId,
	snapshot,
}: {
	actionId: BulkActionId
	snapshot: BulkSelectionSnapshot
}) {
	const { cancelPendingAction, confirmPendingAction, pendingConfirmation, runBulkAction } =
		useBulkActionContext()
	const [result, setResult] = useState<BulkActionResult | null>(null)

	return (
		<div>
			<button
				onClick={() => {
					void runBulkAction(actionId, snapshot).then(setResult)
				}}
				type='button'
			>
				执行批量操作
			</button>
			<button onClick={confirmPendingAction} type='button'>
				确认挂起操作
			</button>
			<button onClick={cancelPendingAction} type='button'>
				取消挂起操作
			</button>
			{pendingConfirmation ? (
				<output data-testid='pending-title'>{pendingConfirmation.copy.title}</output>
			) : null}
			<output data-testid='result-status'>{result?.status ?? 'none'}</output>
		</div>
	)
}

function createAction(id: string, overrides: Partial<BulkAction> = {}): BulkAction {
	return {
		id,
		entity: 'task',
		label: id,
		intent: 'update',
		run: (nextSnapshot) =>
			Promise.resolve(
				createBulkActionResult({
					status: 'success',
					actionId: id,
					snapshot: nextSnapshot,
				}),
			),
		...overrides,
	}
}
