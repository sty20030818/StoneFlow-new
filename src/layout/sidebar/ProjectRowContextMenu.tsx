import {
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuSeparator,
} from '@/shared/components/base/context-menu'
import { ExternalLinkIcon, Trash2Icon } from 'lucide-react'

/** 项目行右键占位菜单（打开 / 回收站） */
export function ProjectRowContextMenu() {
	return (
		<ContextMenuContent className='w-44'>
			<ContextMenuGroup>
				<ContextMenuItem onSelect={() => undefined}>
					<ExternalLinkIcon />
					打开项目
				</ContextMenuItem>
			</ContextMenuGroup>
			<ContextMenuSeparator />
			<ContextMenuGroup>
				<ContextMenuItem disabled variant='destructive'>
					<Trash2Icon />
					移入回收站
				</ContextMenuItem>
			</ContextMenuGroup>
		</ContextMenuContent>
	)
}
