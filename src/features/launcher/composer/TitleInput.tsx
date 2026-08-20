import { useRef, useState } from 'react'
import { Input, TextField } from '@heroui/react'

import { useLauncher } from '../domain/LauncherDomainProvider'

/**
 * 标题输入只负责输入编辑本身。
 * 提交和焦点编排仍然完全走 provider 现有动作。
 */
export function TitleInput() {
	const {
		actions,
		refs: { titleInputRef },
		state,
	} = useLauncher()
	const [composingTitle, setComposingTitle] = useState<string | null>(null)
	const isComposingRef = useRef(false)
	const displayTitle = composingTitle ?? state.draft.title

	return (
		<TextField
			aria-label='Launcher 输入'
			className='flex-1'
			fullWidth
			isDisabled={state.submitState === 'submitting'}
		>
			<Input
				ref={titleInputRef}
				aria-label='Launcher 输入'
				autoComplete='off'
				className='text-[15px] font-semibold'
				onChange={(event) => {
					const nextTitle = event.currentTarget.value
					const nativeEvent = event.nativeEvent
					const isComposing = 'isComposing' in nativeEvent && nativeEvent.isComposing
					if (isComposingRef.current || isComposing) {
						setComposingTitle(nextTitle)
						return
					}

					if (composingTitle !== null) {
						setComposingTitle(null)
					}
					actions.setTitle(nextTitle)
				}}
				onCompositionEnd={(event) => {
					isComposingRef.current = false
					setComposingTitle(null)
					actions.setTitle(event.currentTarget.value)
				}}
				onCompositionStart={(event) => {
					isComposingRef.current = true
					setComposingTitle(event.currentTarget.value)
				}}
				onKeyDown={actions.handleKeyDown}
				placeholder='写下任务…'
				spellCheck={false}
				value={displayTitle}
			/>
		</TextField>
	)
}
