import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { LauncherPage } from './features/launcher'
import { TooltipProvider } from './shared/components/base/tooltip'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<TooltipProvider>
			<LauncherPage />
		</TooltipProvider>
	</StrictMode>,
)
