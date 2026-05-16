import { useCallback, useLayoutEffect, useRef, useState, type RefCallback } from 'react'

import {
	measureQuickCreateLayout,
	type QuickCreateLayoutMeasureResult,
	type QuickCreateLayoutMeasurements,
} from '@/features/quick-create/layout/measureQuickCreateLayout'

export type QuickCreateLayoutRegion =
	| 'surface'
	| 'content'
	| 'composer'
	| 'toast'
	| 'createRow'
	| 'taskBoard'
	| 'projectBoard'
	| 'footer'

export type QuickCreateLayoutController = {
	isReady: boolean
	targetHeight: number | null
	measureKey: unknown
	lastMeasurements: QuickCreateLayoutMeasurements | null
	lastResult: QuickCreateLayoutMeasureResult | null
	getNode: (region: QuickCreateLayoutRegion) => HTMLElement | null
	registerRegion: (region: QuickCreateLayoutRegion) => RefCallback<HTMLElement>
	requestMeasure: () => void
}

const REGION_LIST: QuickCreateLayoutRegion[] = [
	'surface',
	'content',
	'composer',
	'toast',
	'createRow',
	'taskBoard',
	'projectBoard',
	'footer',
]

export function useQuickCreateLayout(measureKey: unknown): QuickCreateLayoutController {
	const [targetHeight, setTargetHeight] = useState<number | null>(null)
	const [isReady, setReady] = useState(false)
	const [readyMeasureKey, setReadyMeasureKey] = useState<unknown>(null)
	const [lastMeasurements, setLastMeasurements] = useState<QuickCreateLayoutMeasurements | null>(
		null,
	)
	const [lastResult, setLastResult] = useState<QuickCreateLayoutMeasureResult | null>(null)
	const measureKeyRef = useRef(measureKey)
	const nodeMapRef = useRef(new Map<QuickCreateLayoutRegion, HTMLElement>())
	const observerRef = useRef<ResizeObserver | null>(null)
	const frameRef = useRef<number | null>(null)
	const fallbackTimerRef = useRef<number | null>(null)
	const mountedRef = useRef(false)
	const refCallbacksRef = useRef(new Map<QuickCreateLayoutRegion, RefCallback<HTMLElement>>())

	const measureNow = useCallback(() => {
		if (frameRef.current !== null) {
			window.cancelAnimationFrame(frameRef.current)
			frameRef.current = null
		}
		if (fallbackTimerRef.current !== null) {
			window.clearTimeout(fallbackTimerRef.current)
			fallbackTimerRef.current = null
		}
		if (!mountedRef.current) {
			return
		}

		const currentMeasureKey = measureKeyRef.current
		const surface = nodeMapRef.current.get('surface')
		const measurements: QuickCreateLayoutMeasurements = {
			contentHeight: readFullHeight(nodeMapRef.current.get('content')),
			composerHeight: readOffsetHeight(nodeMapRef.current.get('composer')),
			toastHeight: readOffsetHeight(nodeMapRef.current.get('toast')),
			createRowHeight: readOffsetHeight(nodeMapRef.current.get('createRow')),
			// Board section 首帧可能还在展开过渡里，offsetHeight 会暂时只有 header。
			// 这里改用完整 scrollHeight，避免 session 首次测量被错误压成最小高度。
			taskBoardHeight: readFullHeight(nodeMapRef.current.get('taskBoard')),
			projectBoardHeight: readFullHeight(nodeMapRef.current.get('projectBoard')),
			footerHeight: readOffsetHeight(nodeMapRef.current.get('footer')),
			surfaceOffsetHeight: readOffsetHeight(surface),
			surfaceClientHeight: surface?.clientHeight ?? 0,
		}
		const result = measureQuickCreateLayout(measurements)

		if (import.meta.env.DEV) {
			console.debug('[quick-create] layout measure', result, measurements)
		}
		setLastMeasurements(measurements)
		setLastResult(result)
		setReadyMeasureKey(currentMeasureKey)

		setTargetHeight((current) => {
			const next = result.targetHeight
			return current === next ? current : next
		})
		setReady(true)
	}, [])

	const requestMeasure = useCallback(() => {
		if (frameRef.current !== null) {
			return
		}

		frameRef.current = window.requestAnimationFrame(measureNow)
		fallbackTimerRef.current = window.setTimeout(measureNow, 0)
	}, [measureNow])

	const registerRegion = useCallback(
		(region: QuickCreateLayoutRegion): RefCallback<HTMLElement> => {
			const cached = refCallbacksRef.current.get(region)
			if (cached) {
				return cached
			}

			const callback: RefCallback<HTMLElement> = (node) => {
				const previousNode = nodeMapRef.current.get(region)
				if (previousNode && observerRef.current) {
					observerRef.current.unobserve(previousNode)
				}

				if (!node) {
					nodeMapRef.current.delete(region)
					requestMeasure()
					return
				}

				nodeMapRef.current.set(region, node)
				observerRef.current?.observe(node)
				requestMeasure()
			}

			refCallbacksRef.current.set(region, callback)
			return callback
		},
		[requestMeasure],
	)

	useLayoutEffect(() => {
		mountedRef.current = true

		if (typeof ResizeObserver !== 'undefined') {
			observerRef.current = new ResizeObserver(() => {
				requestMeasure()
			})

			for (const region of REGION_LIST) {
				const node = nodeMapRef.current.get(region)
				if (node) {
					observerRef.current.observe(node)
				}
			}
		}

		requestMeasure()

		return () => {
			mountedRef.current = false
			observerRef.current?.disconnect()
			observerRef.current = null

			if (frameRef.current !== null) {
				window.cancelAnimationFrame(frameRef.current)
				frameRef.current = null
			}
			if (fallbackTimerRef.current !== null) {
				window.clearTimeout(fallbackTimerRef.current)
				fallbackTimerRef.current = null
			}
		}
	}, [requestMeasure])

	useLayoutEffect(() => {
		measureKeyRef.current = measureKey
		setReady(false)
		setReadyMeasureKey(null)
		setTargetHeight(null)
		setLastMeasurements(null)
		setLastResult(null)
		requestMeasure()
	}, [measureKey, requestMeasure])

	const getNode = useCallback((region: QuickCreateLayoutRegion) => {
		return nodeMapRef.current.get(region) ?? null
	}, [])

	return {
		isReady: isReady && Object.is(readyMeasureKey, measureKey),
		getNode,
		lastMeasurements,
		lastResult,
		measureKey: readyMeasureKey,
		targetHeight,
		registerRegion,
		requestMeasure,
	}
}

function readOffsetHeight(node: HTMLElement | undefined) {
	return node?.offsetHeight ?? 0
}

function readFullHeight(node: HTMLElement | undefined) {
	if (!node) {
		return 0
	}

	return Math.max(node.offsetHeight, node.scrollHeight)
}
