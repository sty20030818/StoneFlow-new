import { CommandIcon } from 'lucide-react'

import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { Button } from '@/shared/ui/base/button'
import { BULK_ACTION_BUTTON_CLASS } from '@/shared/ui/patterns/bulk-action'

export function BulkCommandMenuAction() {
	const openCommand = useDialogStore((state) => state.openCommand)

	return (
		<Button
			className={BULK_ACTION_BUTTON_CLASS}
			onClick={openCommand}
			size='sm'
			type='button'
			variant='outline'
		>
			<CommandIcon data-icon='inline-start' />
			操作
		</Button>
	)
}
