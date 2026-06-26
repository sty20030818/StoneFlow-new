import { z } from 'zod'

export const optionalTrimmedString = z.string().trim().optional()

export const nullableTrimmedString = z.string().trim().nullable()

export const nonEmptyTrimmedString = (message: string) => z.string().trim().min(1, message)
