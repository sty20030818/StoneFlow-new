import { z } from 'zod'

export const optionalTrimmedString = z.string().trim().optional()

export const nonEmptyTrimmedString = (message: string) => z.string().trim().min(1, message)
