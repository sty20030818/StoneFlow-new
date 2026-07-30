export type AppInfoLinkKey = 'website' | 'feedback' | 'privacyPolicy' | 'license'

export type AppInfoLink = {
	key: AppInfoLinkKey
	label: string
	url: string | null
}

/**
 * StoneFlow 的公开资料入口。
 *
 * 地址未由产品确认前必须保持 `null`，以禁用 UI 而非提供虚假跳转。
 */
export const appInfoLinks: readonly AppInfoLink[] = [
	{ key: 'website', label: '官方网站', url: null },
	{ key: 'feedback', label: '反馈与支持', url: null },
	{ key: 'privacyPolicy', label: '隐私政策', url: null },
	{ key: 'license', label: '许可证', url: null },
]

/** 只允许产品已确认的 HTTPS 外部地址被 opener 使用。 */
export function isConfiguredAppInfoUrl(url: string | null): url is string {
	return url?.startsWith('https://') ?? false
}
