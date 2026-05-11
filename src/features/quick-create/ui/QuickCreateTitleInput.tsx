import { useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import { Input } from '@/shared/ui/base/input'

/**
 * 标题输入只负责输入编辑本身。
 * 提交和焦点编排仍然完全走 provider 现有动作。
 */
export function QuickCreateTitleInput() {
	const { actions, refs, state } = useQuickCreate()

	return (
		<Input
			ref={refs.titleInputRef}
			aria-label='Quick Create 输入'
			autoComplete='off'
			className='h-8 flex-1 border-none bg-transparent px-0 text-[15px] font-semibold shadow-none focus-visible:border-transparent focus-visible:ring-0 placeholder:text-sf-text-quaternary'
			disabled={state.submitState === 'submitting'}
			onChange={(event) => actions.setTitle(event.currentTarget.value)}
			onKeyDown={actions.handleInputKeyDown}
			placeholder='写下任务…'
			spellCheck={false}
			value={state.draft.title}
		/>
	)
}
