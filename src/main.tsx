import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles/index.css'

/** 静态开屏在 #root 外的 #sf-boot-shell；由骨架/真壳/Launcher 首帧 dismissBootShell 撤掉 */
createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
