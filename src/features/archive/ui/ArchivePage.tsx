import { ArchiveIcon } from 'lucide-react'

import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { ShellPlaceholderPage } from '@/features/workspace-shell/ui/ShellPlaceholderPage'

export function ArchivePage() {
	const { scope, spaceId } = useScopeRoute()

	return (
		<ShellPlaceholderPage
			backTo={buildScopedSectionPath(scope, 'inbox', spaceId)}
			description='归档页面，生命周期回收规则会在后续阶段接入。'
			icon={ArchiveIcon}
			title='归档'
		/>
	)
}
