import { CommandIcon } from 'lucide-react'

import { useDialogStore } from '@/features/shell-dialogs'
import { Button } from '@/shared/components/base/button'
import { BULK_ACTION_BUTTON_CLASS } from '@/shared/components/patterns/bulk-action'

export function BulkCommandMenuAction() {
	const openCommand = useDialogStore((state) => state.openCommand)

	return (
		<Button
			className={BULK_ACTION_BUTTON_CLASS}
			onClick={() => openCommand('default')}
			size='sm'
			type='button'
			variant='outline'
		>
			<CommandIcon data-icon='inline-start' />
			操作
		</Button>
	)
}
