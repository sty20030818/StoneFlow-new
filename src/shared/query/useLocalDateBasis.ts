import { useEffect, useState } from 'react'
import { format } from 'date-fns'

/** 同一天的分页共用日期基准；午夜和休眠恢复后开启新窗口。 */
export function useLocalDateBasis(): string {
	const [dateBasis, setDateBasis] = useState(() => format(new Date(), 'yyyy-MM-dd'))
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout>
		const refresh = () => {
			const now = new Date()
			setDateBasis(format(now, 'yyyy-MM-dd'))
			clearTimeout(timer)
			const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
			timer = setTimeout(refresh, midnight.getTime() - now.getTime())
		}
		const onVisible = () => {
			if (document.visibilityState === 'visible') refresh()
		}
		refresh()
		window.addEventListener('focus', refresh)
		document.addEventListener('visibilitychange', onVisible)
		return () => {
			clearTimeout(timer)
			window.removeEventListener('focus', refresh)
			document.removeEventListener('visibilitychange', onVisible)
		}
	}, [])
	return dateBasis
}
