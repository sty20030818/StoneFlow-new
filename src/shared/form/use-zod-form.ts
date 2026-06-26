import { zodResolver } from '@hookform/resolvers/zod'
import {
	useForm,
	type DefaultValues,
	type FieldValues,
	type UseFormProps,
	type UseFormReturn,
} from 'react-hook-form'
import type { z } from 'zod'

type SchemaValues<TSchema extends ZodType> = z.infer<TSchema> & FieldValues
type ZodType = z.ZodTypeAny

type UseZodFormOptions<TSchema extends ZodType> = Omit<
	UseFormProps<SchemaValues<TSchema>>,
	'criteriaMode' | 'mode' | 'reValidateMode' | 'resolver'
> & {
	schema: TSchema
	defaultValues: DefaultValues<SchemaValues<TSchema>>
}

/**
 * StoneFlow 默认表单 hook：
 * - 统一接 Zod resolver
 * - 统一 onChange 校验时机
 */
export function useZodForm<TSchema extends ZodType>({
	schema,
	defaultValues,
	...options
}: UseZodFormOptions<TSchema>): UseFormReturn<SchemaValues<TSchema>> {
	const resolver = zodResolver(schema as never) as unknown as UseFormProps<
		SchemaValues<TSchema>
	>['resolver']

	return useForm<SchemaValues<TSchema>>({
		mode: 'onChange',
		reValidateMode: 'onChange',
		criteriaMode: 'firstError',
		shouldFocusError: true,
		resolver,
		defaultValues,
		...options,
	})
}
