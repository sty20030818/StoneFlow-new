import { useMemo } from 'react'
import { useFormState, type FieldValues, type UseFormReturn } from 'react-hook-form'

import {
	useRegisterSubmitTarget,
	type SubmitIntent,
	type SubmitTargetContext,
} from '@/features/submit/model'

type UseSubmitTargetFromFormOptions<TFieldValues extends FieldValues> = {
	id: string | null
	title: string
	priority: number
	context: SubmitTargetContext
	form: UseFormReturn<TFieldValues>
	canSubmit?: boolean
	isSubmitting: boolean
	supportedIntents?: SubmitIntent[]
	getIntentDisabledReason?: (intent: SubmitIntent) => string | undefined
	submit: (intent?: SubmitIntent) => void | Promise<void>
}

/**
 * 把 RHF 表单状态桥接到 SubmitRegistry。
 * 组件只声明业务 submit 语义，registry 接线保持统一。
 */
export function useSubmitTargetFromForm<TFieldValues extends FieldValues>({
	id,
	title,
	priority,
	context,
	form,
	canSubmit,
	isSubmitting,
	supportedIntents,
	getIntentDisabledReason,
	submit,
}: UseSubmitTargetFromFormOptions<TFieldValues>) {
	const { isValid } = useFormState({
		control: form.control,
	})
	const resolvedCanSubmit = (canSubmit ?? isValid) && !isSubmitting

	const target = useMemo(
		() =>
			id
				? {
						id,
						title,
						priority,
						canSubmit: resolvedCanSubmit,
						supportedIntents,
						getIntentDisabledReason,
						submit,
						context,
					}
				: null,
		[
			context,
			resolvedCanSubmit,
			getIntentDisabledReason,
			id,
			priority,
			submit,
			supportedIntents,
			title,
		],
	)

	useRegisterSubmitTarget(target)
}
