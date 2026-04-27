import { MainCardHeader, MainCardLayout } from '@/app/layouts/main-card/MainCardLayout'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import { SettingsIcon } from 'lucide-react'

/**
 * Shell 内的设置占位页，先承接路由与主内容区域，后续再拆分具体设置模块。
 */
export function SettingsPage() {
	return (
		<MainCardLayout header={<MainCardHeader title='Settings' />} toolbar={null}>
			<div>
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<SettingsIcon />
						</EmptyMedia>
						<EmptyTitle>设置功能建设中</EmptyTitle>
						<EmptyDescription>这里会承接账户、外观、快捷键和工作区偏好等设置项。</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</div>
		</MainCardLayout>
	)
}
