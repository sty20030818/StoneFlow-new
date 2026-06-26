import { nonEmptyTrimmedString } from './primitives'

export const titleString = (label: string) => nonEmptyTrimmedString(`请输入${label}`)

export const descriptionString = () => nonEmptyTrimmedString('请输入说明').optional()
