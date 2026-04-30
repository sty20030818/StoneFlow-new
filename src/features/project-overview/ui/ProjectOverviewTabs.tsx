import { type ProjectOverviewViewKey } from '@/features/project/model/types'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/base/tabs'

type ProjectOverviewTabsProps = {
	value: ProjectOverviewViewKey
	onChange: (value: ProjectOverviewViewKey) => void
}

const PROJECT_OVERVIEW_TABS: Array<{ key: ProjectOverviewViewKey; label: string }> = [
	{ key: 'active', label: 'Active' },
	{ key: 'completed', label: 'Completed' },
	{ key: 'archived', label: 'Archived' },
	{ key: 'all', label: 'All' },
]

export function ProjectOverviewTabs({ value, onChange }: ProjectOverviewTabsProps) {
	return (
		<Tabs
			onValueChange={(nextValue) => onChange(nextValue as ProjectOverviewViewKey)}
			value={value}
		>
			<TabsList>
				{PROJECT_OVERVIEW_TABS.map((tab) => (
					<TabsTrigger key={tab.key} value={tab.key}>
						{tab.label}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	)
}
