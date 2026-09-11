import { cn as mergeClasses } from '@heroui/react'
import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
	return mergeClasses(clsx(inputs)) ?? ''
}
