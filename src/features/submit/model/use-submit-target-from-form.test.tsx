import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FormProvider } from 'react-hook-form'

import { SubmitRegistryProvider, useSubmitRegistryContext } from '@/features/submit/model'
import { useZodForm } from '@/shared/form/use-zod-form'
import { z } from 'zod'

import { useSubmitTargetFromForm } from './use-submit-target-from-form'

const schema = z.object({
	name: z.string().trim().min(1, '请输入名称'),
})

describe('useSubmitTargetFromForm', () => {
	it('把 isValid / isSubmitting / supportedIntents 映射到 SubmitRegistry 快照', async () => {
		render(
			<SubmitRegistryProvider>
				<FormProbe />
			</SubmitRegistryProvider>,
		)

		expect(screen.getByTestId('default-state')).toHaveTextContent('disabled')
		expect(screen.getByTestId('continue-state')).toHaveTextContent('disabled')
		expect(screen.getByTestId('open-state')).toHaveTextContent('disabled')

		fireEvent.change(screen.getByLabelText('probe-name'), { target: { value: 'StoneFlow' } })

		await waitFor(() => {
			expect(screen.getByTestId('default-state')).toHaveTextContent('enabled')
			expect(screen.getByTestId('continue-state')).toHaveTextContent('enabled')
		})

		fireEvent.click(screen.getByRole('button', { name: '开始提交' }))

		await waitFor(() => {
			expect(screen.getByTestId('default-state')).toHaveTextContent('disabled')
			expect(screen.getByTestId('continue-state')).toHaveTextContent('disabled')
			expect(screen.getByTestId('open-state')).toHaveTextContent('disabled')
		})
	})
})

function FormProbe() {
	const [submitting, setSubmitting] = useState(false)
	const form = useZodForm({
		schema,
		defaultValues: {
			name: '',
		},
	})
	const registry = useSubmitRegistryContext()
	const name = form.watch('name')

	useSubmitTargetFromForm({
		id: 'probe-form',
		title: 'Probe Form',
		priority: 100,
		context: { source: 'space-editor' },
		form,
		isSubmitting: submitting,
		supportedIntents: ['continue', 'open'],
		getIntentDisabledReason: (intent) => (intent === 'open' ? undefined : undefined),
		submit: async () => undefined,
	})

	return (
		<FormProvider {...form}>
			<div>
				<input
					aria-label='probe-name'
					onChange={(event) =>
						form.setValue('name', event.currentTarget.value, {
							shouldDirty: true,
							shouldValidate: true,
						})
					}
					value={name}
				/>
				<button onClick={() => setSubmitting(true)} type='button'>
					开始提交
				</button>
				<div data-testid='default-state'>
					{registry.canSubmitIntent('default') ? 'enabled' : 'disabled'}
				</div>
				<div data-testid='continue-state'>
					{registry.canSubmitIntent('continue') ? 'enabled' : 'disabled'}
				</div>
				<div data-testid='open-state'>
					{registry.canSubmitIntent('open') ? 'enabled' : 'disabled'}
				</div>
			</div>
		</FormProvider>
	)
}
