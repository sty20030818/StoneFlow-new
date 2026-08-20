import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { bootstrapAppearance } from './features/appearance'
import { LauncherPage } from './features/launcher'
import './styles/index.css'

bootstrapAppearance()

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<LauncherPage />
	</StrictMode>,
)
