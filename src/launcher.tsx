import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { LauncherPage } from './features/launcher'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<LauncherPage />
	</StrictMode>,
)
