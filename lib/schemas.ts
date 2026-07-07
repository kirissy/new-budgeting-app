import { z } from 'zod'

const FREQUENCIES = ['daily', 'weekly', 'biweekly', 'semi-monthly', 'monthly', 'quarterly', 'annually'] as const
const GOAL_TYPES = ['holiday', 'emergency', 'custom'] as const

export const payProfileSchema = z.object({
  income_amount: z
    .string()
    .min(1, 'Income is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
  currency: z.string().min(1, 'Currency is required'),
  frequency: z.enum(FREQUENCIES, 'Select a frequency'),
})

export const profileSchema = z.object({
  base_currency: z.string().min(1, 'Base currency is required'),
})

export const expenseItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
  currency: z.string().min(1, 'Currency is required'),
})

export const billSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
  currency: z.string().min(1, 'Currency is required'),
  frequency: z.enum(FREQUENCIES, 'Select a frequency'),
  next_due_date: z.string().optional(),
})

export const goalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(GOAL_TYPES, 'Select a goal type'),
  target_amount: z
    .string()
    .min(1, 'Target amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
  currency: z.string().min(1, 'Currency is required'),
  target_date: z.string().optional(),
  current_saved: z
    .string()
    .refine((v) => v === '' || (!isNaN(Number(v)) && Number(v) >= 0), 'Must be a non-negative number'),
})

export type PayProfileInput = z.infer<typeof payProfileSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type ExpenseItemInput = z.infer<typeof expenseItemSchema>
export type BillInput = z.infer<typeof billSchema>
export type GoalInput = z.infer<typeof goalSchema>
