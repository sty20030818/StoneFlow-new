import { Chip } from '@heroui/react'

import type { ChangelogRelease as ChangelogReleaseModel } from './contract'
import { ChangelogMarkdown } from './ChangelogMarkdown'

export function ChangelogRelease({ release }: { release: ChangelogReleaseModel }) {
	const content = Array.from(
		release.sections,
		([category, body]) => `### ${category}\n\n${body}`,
	).join('\n\n')

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
			<ChangelogMarkdown content={content} />
		</section>
	)
}
