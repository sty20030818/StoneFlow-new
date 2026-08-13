import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { LauncherPage } from './features/launcher'
import { TooltipProvider } from './shared/components/base/tooltip'
import './styles/index.css'

document.documentElement.classList.add('light')
document.documentElement.dataset.theme = 'stoneflow-light'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<TooltipProvider>
			<LauncherPage />
		</TooltipProvider>
	</StrictMode>,
)
