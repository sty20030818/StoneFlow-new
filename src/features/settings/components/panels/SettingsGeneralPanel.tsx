import { useState } from 'react'
import { Description, Radio, RadioGroup } from '@heroui/react'

import { SettingsSection } from '../settingsShared'
import { useSidebarSettingsStore } from '../../model/useSidebarSettingsStore'
import { useSetDefaultSpaceMutation, useSpaces } from '@/features/space'
import { Button } from '@/shared/components/base/button'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/components/base/select'
import {
	formFieldHintClass,
	formFieldLabelVariants,
	formFieldStackClass,
} from '@/shared/components/patterns/form-field'
import { statusNoticeCompactTextClass } from '@/shared/components/patterns/status-notice'
import { StatusNotice } from '@/shared/components/StatusNotice'

/**
 * 通用设置：默认空间等跨工作区偏好。
 */
export function SettingsGeneralPanel() {
	const { spaces, status: spaceStatus, error: spaceError, refetch: refetchSpaces } = useSpaces()
	const setDefaultSpace = useSetDefaultSpaceMutation()
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const defaultSpaceId = spaces.find((space) => space.isDefault)?.id ?? ''
	const detailPresentation = useSidebarSettingsStore(
		(state) => state.uiDevicePreferences?.detailPresentation ?? 'sheet',
	)
	const setDetailPresentation = useSidebarSettingsStore((state) => state.setDetailPresentation)

	function handleDefaultSpaceChange(nextSpaceId: string) {
		if (!nextSpaceId || nextSpaceId === defaultSpaceId) {
			return
		}

		setPending(true)
		setError(null)
		void setDefaultSpace
			.mutateAsync(nextSpaceId)
			.catch((err) => {
				setError(err instanceof Error ? err.message : '设置更新失败')
			})
			.finally(() => {
				setPending(false)
			})
	}

	return (
		<div className='flex w-full min-w-0 flex-col gap-4'>
			<SettingsSection
				description='只决定宽窗口中的任务详情呈现方式。窗口小于 1024px，或主列表可用宽度不足 640px 时，系统会自动使用 Sheet。'
				title='任务详情'
			>
				<RadioGroup
					aria-label='宽屏任务详情呈现方式'
					className='md:max-w-xl'
					onChange={(value) => {
						if (value === 'sheet' || value === 'aside') {
							void setDetailPresentation(value)
						}
					}}
					value={detailPresentation}
				>
					<Radio value='sheet'>
						<Radio.Content>
							<Radio.Control>
								<Radio.Indicator />
							</Radio.Control>
							Sheet
						</Radio.Content>
						<Description>从右侧覆盖打开，适合临时查看。</Description>
					</Radio>
					<Radio value='aside'>
						<Radio.Content>
							<Radio.Control>
								<Radio.Indicator />
							</Radio.Control>
							Aside
						</Radio.Content>
						<Description>与任务列表并排显示，适合连续切换任务。</Description>
					</Radio>
				</RadioGroup>
			</SettingsSection>
			<SettingsSection
				description='默认空间会影响全局新建和兜底恢复时的优先落点，建议把最常用的空间放在这里。'
				title='默认空间'
			>
				{spaceStatus === 'error' ? (
					<StatusNotice
						actions={
							<Button
								onClick={() => void refetchSpaces()}
								size='sm'
								type='button'
								variant='secondary'
							>
								重试
							</Button>
						}
						description={spaceError ?? 'Space 列表加载失败。'}
						layout='split'
						title='无法读取 Space'
						variant='danger'
					/>
				) : spaces.length === 0 && spaceStatus === 'ready' ? (
					<StatusNotice
						description='当前还没有可用空间，所以暂时不能设置默认项。等空间准备好之后，再回来这里调整就可以了。'
						title='当前没有可用空间'
					/>
				) : (
					<div className='flex flex-col gap-3 md:max-w-sm'>
						<label className={formFieldStackClass}>
							<span className={formFieldLabelVariants()}>选择默认空间</span>
							<Select
								disabled={pending || spaceStatus === 'loading' || spaces.length === 0}
								onValueChange={handleDefaultSpaceChange}
								value={defaultSpaceId}
							>
								<SelectTrigger aria-label='默认空间' className='h-10 w-full'>
									<SelectValue placeholder='选择默认空间' />
								</SelectTrigger>
								<SelectContent position='popper'>
									<SelectGroup>
										{spaces.map((space) => (
											<SelectItem key={space.id} value={space.id}>
												{space.name}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</label>
						<p className={formFieldHintClass}>
							当前默认项：
							{spaces.find((space) => space.id === defaultSpaceId)?.name ?? '未设置'}
						</p>
					</div>
				)}
				{error ? (
					<StatusNotice
						className={`mt-4 ${statusNoticeCompactTextClass}`}
						role='alert'
						size='sm'
						variant='danger'
					>
						{error}
					</StatusNotice>
				) : null}
			</SettingsSection>
		</div>
	)
}
