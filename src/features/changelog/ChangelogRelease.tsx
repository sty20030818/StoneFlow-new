import { Chip } from '@heroui/react'
import { Markdown, type MarkdownProps } from '@heroui-pro/react/markdown'

import type { ChangelogRelease as ChangelogReleaseModel } from './contract'

const components: MarkdownProps['components'] = {
	hr: () => null,
}

export function ChangelogReleaseContent({
	release,
	headingLevel = 4,
}: {
	release: ChangelogReleaseModel
	headingLevel?: 3 | 4
}) {
	return (
		<div className='space-y-4'>
			{Array.from(release.sections, ([category, body]) => (
				<Markdown components={components} key={category}>
					{`${'#'.repeat(headingLevel)} ${category}\n\n${body}`}
				</Markdown>
			))}
		</div>
	)
}

export function ChangelogRelease({ release }: { release: ChangelogReleaseModel }) {
	return (
		<section>
			<div className='mb-4 flex items-baseline gap-2'>
				<h3 className='text-base font-semibold text-foreground'>v{release.version}</h3>
				<span className='text-xs text-muted'>{release.date}</span>
				{release.yanked ? (
					<Chip color='danger' size='sm' variant='soft'>
						已撤回
					</Chip>
				) : null}
			</div>
			<ChangelogReleaseContent release={release} />
		</section>
	)
}
