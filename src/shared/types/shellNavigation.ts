/**
 * 壳级导航目标（唯一真相）。
 * app/navigation 与 command adapter 共用，禁止再抄一份 union。
 */
export type ShellNavigationTarget =
	| 'inbox'
	| 'tasks'
	| 'views'
	| `views/${string}`
	| 'projects'
	| 'archive'
	| 'trash'
	| 'settings'
