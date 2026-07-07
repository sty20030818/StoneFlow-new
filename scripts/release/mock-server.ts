/**
 * 本地更新测试服务器
 *
 * 启动一个本地 HTTP 服务器，模拟 Cloudflare R2 上的更新端点，用于开发和测试更新流程。
 *
 * 用法:
 *   bun run mock:updates                    # 默认：有新版本可用
 *   bun run mock:updates -- --no-update     # 模拟无新版本（已是最新）
 *   bun run mock:updates -- --beta          # 模拟 beta 渠道更新
 *   bun run mock:updates -- --error         # 模拟服务器错误（500）
 *   bun run mock:updates -- --slow          # 模拟网络慢（延迟 3 秒返回）
 *   bun run mock:updates -- --version 0.2.0 # 指定返回的版本号
 *   bun run mock:updates -- --port 1420     # 指定端口
 *
 * 可以组合参数:
 *   bun run mock:updates -- --beta --slow --version 0.2.0-beta.1
 *
 * 配合 debug 模式自动检测（mock 跑在 1420 端口时，app 会自动切换到本地地址）
 */

import { argv, serve } from 'bun'

// ─── 参数解析 ─────────────────────────────────────────────
function getArg(name: string): string | undefined {
	const idx = argv.indexOf(name)
	return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : undefined
}
function hasFlag(name: string): boolean {
	return argv.includes(name)
}

const PORT = parseInt(getArg('--port') || '1420')
// stable 默认版本（不能带预发布后缀，否则会被 stable 渠道过滤器拦截）
const DEFAULT_STABLE_VERSION = '99.0.0'
// beta 默认版本
const DEFAULT_BETA_VERSION = '99.0.0-beta.1'
const MOCK_VERSION =
	getArg('--version') || (hasFlag('--beta') ? DEFAULT_BETA_VERSION : DEFAULT_STABLE_VERSION)
const CHANNEL = hasFlag('--beta') ? 'beta' : 'stable'
const SCENARIO: 'update' | 'noUpdate' | 'error' = hasFlag('--error')
	? 'error'
	: hasFlag('--no-update')
		? 'noUpdate'
		: 'update'
const SLOW_MODE = hasFlag('--slow')
const SLOW_DELAY_MS = 3000

// 当前应用版本（用于 no-update 场景返回比它低的版本）
const CURRENT_APP_VERSION = '0.1.0'

// ─── 构建响应数据 ─────────────────────────────────────────

function buildPlatforms(baseUrl: string, version: string) {
	const platforms: Record<string, { signature: string; url: string }> = {}
	platforms['darwin-x86_64'] = {
		signature: 'mock-signature-for-testing-only',
		url: `${baseUrl}/mock/StoneFlow_${version}_x64.dmg`,
	}
	platforms['darwin-aarch64'] = {
		signature: 'mock-signature-for-testing-only',
		url: `${baseUrl}/mock/StoneFlow_${version}_aarch64.dmg`,
	}
	platforms['windows-x86_64'] = {
		signature: 'mock-signature-for-testing-only',
		url: `${baseUrl}/mock/StoneFlow_${version}_x64_en-US.msi.zip`,
	}
	platforms['linux-x86_64'] = {
		signature: 'mock-signature-for-testing-only',
		url: `${baseUrl}/mock/StoneFlow_${version}_x64.AppImage.tar.gz`,
	}
	return platforms
}

function buildLatestJson(baseUrl: string, channel: 'stable' | 'beta') {
	if (SCENARIO === 'error') return null

	const isNoUpdate = SCENARIO === 'noUpdate'
	const version = isNoUpdate ? '0.0.1' : MOCK_VERSION

	const notes = isNoUpdate
		? '当前已是最新版本'
		: channel === 'beta'
			? `## 🧪 Beta 测试版本 ${version}\n\n这是 beta 渠道的测试更新，包含实验性功能。\n\n### 注意事项\n- 可能存在未修复的问题\n- 仅用于测试，不建议日常使用`
			: `## 🎉 测试版本 ${version}\n\n这是通过本地 mock 服务器返回的模拟更新。\n\n### 测试场景\n- ✅ 更新检查逻辑\n- ✅ 弹窗展示与更新说明\n- ✅ 跳过此版本功能\n- ✅ 4 种检查模式切换\n- ✅ 渠道切换（stable/beta）\n- ✅ 错误状态展示\n\n### 说明\n这是 mock 数据，点击"立即更新"会因为签名验证失败而报错（这是正常的，mock 无法测试真实下载安装）。`

	return {
		version,
		notes,
		pub_date: new Date().toISOString(),
		platforms: isNoUpdate ? {} : buildPlatforms(baseUrl, version),
	}
}

// ─── 服务器 ───────────────────────────────────────────────

const server = serve({
	port: PORT,
	async fetch(req) {
		const url = new URL(req.url)
		const baseUrl = `${url.protocol}//${url.host}`

		// CORS
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': '*',
		}

		if (req.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders })
		}

		// 慢模式延迟
		if (SLOW_MODE) {
			await new Promise((r) => setTimeout(r, SLOW_DELAY_MS))
		}

		console.log(
			`[${new Date().toISOString()}] ${req.method} ${url.pathname}  scenario=${SCENARIO}  channel=${CHANNEL}`,
		)

		// ── 更新端点 ──
		const isStable = url.pathname === '/stoneflow/updates/stable/latest.json'
		const isBeta = url.pathname === '/stoneflow/updates/beta/latest.json'

		if (isStable || isBeta) {
			const channel = isStable ? 'stable' : 'beta'

			// beta 路径下，如果当前 mock 是 beta 模式，返回 beta 更新；否则返回低版本
			if (channel === 'beta' && CHANNEL !== 'beta') {
				// 非 beta 模式下 beta 端点返回低版本
				const body = JSON.stringify(
					{
						version: '0.0.1',
						notes: '',
						pub_date: new Date().toISOString(),
						platforms: {},
					},
					null,
					2,
				)
				return new Response(body, {
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json',
						'Cache-Control': 'no-cache',
					},
				})
			}

			if (channel === 'stable' && CHANNEL === 'beta') {
				// beta 模式下 stable 端点返回低版本
				const body = JSON.stringify(
					{
						version: '0.0.1',
						notes: '',
						pub_date: new Date().toISOString(),
						platforms: {},
					},
					null,
					2,
				)
				return new Response(body, {
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json',
						'Cache-Control': 'no-cache',
					},
				})
			}

			if (SCENARIO === 'error') {
				return new Response('Internal Server Error', {
					status: 500,
					headers: corsHeaders,
				})
			}

			const json = buildLatestJson(baseUrl, channel)
			if (!json) {
				return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
			}

			return new Response(JSON.stringify(json, null, 2), {
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
					'Cache-Control': 'no-cache',
				},
			})
		}

		// ── 模拟下载文件（返回 1MB 零字节，用于测试进度条，但签名无效最终会失败）──
		if (url.pathname.startsWith('/mock/')) {
			// 支持模拟下载错误
			if (SCENARIO === 'error') {
				return new Response('Not Found', { status: 404, headers: corsHeaders })
			}

			const mockSize = 1024 * 1024 // 1MB
			// 用分块传输模拟慢下载
			if (SLOW_MODE) {
				const encoder = new TextEncoder()
				const chunk = new Uint8Array(64 * 1024) // 64KB per chunk
				let sent = 0
				const stream = new ReadableStream({
					async start(controller) {
						while (sent < mockSize) {
							await new Promise((r) => setTimeout(r, 100))
							controller.enqueue(chunk)
							sent += chunk.length
						}
						controller.close()
					},
				})
				return new Response(stream, {
					headers: {
						...corsHeaders,
						'Content-Type': 'application/octet-stream',
						'Transfer-Encoding': 'chunked',
					},
				})
			}

			const buffer = new Uint8Array(mockSize)
			return new Response(buffer, {
				headers: {
					...corsHeaders,
					'Content-Type': 'application/octet-stream',
					'Content-Length': String(mockSize),
				},
			})
		}

		// ── 健康检查 ──
		if (url.pathname === '/health') {
			return new Response(
				JSON.stringify({
					ok: true,
					version: MOCK_VERSION,
					channel: CHANNEL,
					scenario: SCENARIO,
					slow: SLOW_MODE,
					currentAppVersion: CURRENT_APP_VERSION,
				}),
				{ headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
			)
		}

		// ── 首页 ──
		if (url.pathname === '/' || url.pathname === '') {
			const html = `<!DOCTYPE html>
<html><head><title>StoneFlow Mock Update Server</title>
<style>body{font-family:-apple-system,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;color:#222}
code{background:#f4f4f4;padding:2px 6px;border-radius:4px;font-size:13px}
.scenario{padding:12px 16px;border-radius:8px;margin:8px 0;font-size:14px}
.active{background:#e8f5e9;border:1px solid #66bb6a}
.inactive{background:#f5f5f5;border:1px solid #ddd;color:#666}
table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #ddd;padding:8px 12px;text-align:left;font-size:14px}
th{background:#fafafa}</style></head><body>
<h1>StoneFlow 本地更新测试服务器</h1>
<table>
<tr><td>Mock 版本</td><td><strong>${MOCK_VERSION}</strong></td></tr>
<tr><td>模拟渠道</td><td><strong>${CHANNEL}</strong></td></tr>
<tr><td>场景</td><td><strong>${SCENARIO}</strong></td></tr>
<tr><td>慢模式</td><td><strong>${SLOW_MODE ? '开启（延迟 3s）' : '关闭'}</strong></td></tr>
</table>
<h2>可用端点</h2>
<ul>
<li><a href="/stoneflow/updates/stable/latest.json">/stoneflow/updates/stable/latest.json</a></li>
<li><a href="/stoneflow/updates/beta/latest.json">/stoneflow/updates/beta/latest.json</a></li>
<li><a href="/health">/health</a></li>
</ul>
<h2>场景切换命令</h2>
<table>
<tr><th>命令</th><th>模拟什么</th></tr>
<tr><td><code>bun run mock:updates</code></td><td>有新版本可用（默认）</td></tr>
<tr><td><code>bun run mock:updates -- --no-update</code></td><td>当前已是最新</td></tr>
<tr><td><code>bun run mock:updates:beta</code></td><td>Beta 渠道有新版本</td></tr>
<tr><td><code>bun run mock:updates -- --error</code></td><td>服务器错误</td></tr>
<tr><td><code>bun run mock:updates -- --slow</code></td><td>网络慢（延迟 3s）</td></tr>
</table>
<p style="color:#999;font-size:12px;margin-top:40px">debug 模式下 app 会自动检测到此服务器，无需修改配置。</p>
</body></html>`
			return new Response(html, {
				headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
			})
		}

		return new Response('Not Found', { status: 404, headers: corsHeaders })
	},
})

// ─── 启动信息 ─────────────────────────────────────────────

const scenarioText = {
	update: '有新版本可用',
	noUpdate: '无新版本（已是最新）',
	error: '服务器错误',
}[SCENARIO]

console.log(`\n🚀 StoneFlow Mock 更新服务器已启动`)
console.log(`   地址: http://localhost:${PORT}`)
console.log(`   版本: ${MOCK_VERSION}`)
console.log(`   渠道: ${CHANNEL}`)
console.log(`   场景: ${scenarioText}`)
if (SLOW_MODE) console.log(`   慢模式: 开启 (${SLOW_DELAY_MS}ms 延迟)`)
console.log(`\n   Stable: http://localhost:${PORT}/stoneflow/updates/stable/latest.json`)
console.log(`   Beta:   http://localhost:${PORT}/stoneflow/updates/beta/latest.json`)
console.log(`\n   按 Ctrl+C 停止\n`)
