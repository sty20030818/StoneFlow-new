import { lazy, Suspense } from 'react'

import { AboutDialogHost } from '@/features/app-info'
import { ChangelogDialogHost } from '@/features/changelog'
import type { UpdateChannel } from '@/features/update/contract'
import { SystemStatusChip, UpdateDialogHost } from '@/features/update'

import type { ShellCreationOverlaysProps } from './ShellCreationOverlays'

const LazyShellCreationOverlays = lazy(async () => ({
	default: (await import('./ShellCreationOverlays')).ShellCreationOverlays,
}))

export type ShellOverlaysProps = ShellCreationOverlaysProps & {
	changelogOpen: boolean
	changelogChannel: UpdateChannel
	changelogFocusVersion?: string | null
	onChangelogOpenChange: (open: boolean) => void
	aboutOpen: boolean
	onAboutOpenChange: (open: boolean) => void
	onOpenChangelogFromAbout: () => void
}

export function ShellOverlays({
	changelogOpen,
	changelogChannel,
	changelogFocusVersion,
	onChangelogOpenChange,
	aboutOpen,
	onAboutOpenChange,
	onOpenChangelogFromAbout,
	...creationProps
}: ShellOverlaysProps) {
	const creationOpen = Boolean(
		(creationProps.createDialogType && !creationProps.shouldDelayTaskCreateDialog) ||
		creationProps.customDateDialog,
	)

	return (
		<>
			{creationOpen ? (
				<Suspense fallback={null}>
					<LazyShellCreationOverlays {...creationProps} />
				</Suspense>
			) : null}
			<UpdateDialogHost />
			<ChangelogDialogHost
				channel={changelogChannel}
				focusVersion={changelogFocusVersion}
				onOpenChange={onChangelogOpenChange}
				open={changelogOpen}
			/>
			<AboutDialogHost
				onOpenChange={onAboutOpenChange}
				onOpenChangelog={onOpenChangelogFromAbout}
				open={aboutOpen}
			/>
			<SystemStatusChip />
		</>
	)
}
