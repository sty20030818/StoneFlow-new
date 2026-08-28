import type { ReactNode } from 'react'

import { FolderIcon, TargetIcon } from 'lucide-react'

export function getCommandMenuPlacementLeading(kind: 'project' | 'standalone'): ReactNode {
	if (kind !== 'project') {
		return <TargetIcon className='size-4 text-muted' />
	}

	return <FolderIcon className='size-4 text-muted' />
}
