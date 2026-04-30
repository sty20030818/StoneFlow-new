import { Link } from 'react-router-dom'

import { MainCardHeader, MainCardLayout } from '@/app/layouts/main-card/MainCardLayout'
import { Button } from '@/shared/ui/base/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import type { LucideIcon } from 'lucide-react'

type ShellPlaceholderPageProps = {
	title: string
	description: string
	icon: LucideIcon
	backTo: string
	backLabel?: string
}

/**
 * 阶段 3 的占位页统一骨架：只承接导航与主内容区，不提前塞真实业务逻辑。
 */
export function ShellPlaceholderPage({
	title,
	description,
	icon: Icon,
	backTo,
	backLabel = '返回 Inbox',
}: ShellPlaceholderPageProps) {
	return (
		<MainCardLayout header={<MainCardHeader title={title} />} toolbar={null}>
			<EmptyPage>
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<Icon />
						</EmptyMedia>
						<EmptyTitle>{title}</EmptyTitle>
						<EmptyDescription>{description}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild>
							<Link to={backTo}>{backLabel}</Link>
						</Button>
					</EmptyContent>
				</Empty>
			</EmptyPage>
		</MainCardLayout>
	)
}
