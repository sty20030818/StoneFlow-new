import { MainCardHeader, MainCardLayout } from '@/app/layouts/main-card/MainCardLayout'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { SettingsIcon } from 'lucide-react'

/**
 * Shell 内的设置占位页，先承接路由与主内容区域，后续再拆分具体设置模块。
 */
export function SettingsPage() {
	return (
		<MainCardLayout header={<MainCardHeader title='Settings' />} toolbar={null}>
			<div className='pt-4'>
				<StatusNotice className='text-sm'>
					<div className='space-y-1'>
						<p className='inline-flex items-center gap-2 text-sm font-medium text-current'>
							<SettingsIcon className='size-4 text-(--sf-color-shell-tertiary)' />
							设置功能建设中
						</p>
						<p className='text-sm leading-6 opacity-90'>
							这里会承接账户、外观、快捷键和工作区偏好等设置项。
						</p>
					</div>
				</StatusNotice>
			</div>
		</MainCardLayout>
	)
}
