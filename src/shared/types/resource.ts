export type TaskResource = {
	id: string
	type: 'doc_link' | 'local_file' | 'local_folder'
	title: string
	target: string
}
