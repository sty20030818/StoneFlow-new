import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { bootstrapAppearance } from '@/features/appearance'

import '../styles/index.css'
import './uiLab.css'
import { UiLabApp } from './UiLabApp'

bootstrapAppearance()

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<UiLabApp />
	</StrictMode>,
)
