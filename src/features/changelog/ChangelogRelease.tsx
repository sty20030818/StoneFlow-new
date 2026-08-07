import { Badge } from '@/shared/components/base/badge'

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
				<h3 className='text-[16px] font-semibold text-foreground'>v{release.version}</h3>
				<span className='text-[12px] text-sf-text-tertiary'>{release.date}</span>
				{release.yanked ? <Badge variant='destructive'>已撤回</Badge> : null}
			</div>
			<ChangelogMarkdown content={content} />
		</section>
	)
}
