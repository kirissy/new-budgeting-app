import { z } from 'zod'

const FREQUENCIES = ['daily', 'weekly', 'biweekly', 'semi-monthly', 'monthly', 'quarterly', 'annually'] as const
const GOAL_TYPES = ['holiday', 'emergency', 'custom'] as const
const EXPENSE_CATEGORIES = [
  'food_dining', 'groceries', 'transport', 'housing', 'utilities',
  'shopping', 'entertainment', 'health', 'travel', 'other',
] as const

export const payProfileSchema = z.object({
  income_amount: z
    .string()
    .min(1, 'Income is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
  currency: z.string().min(1, 'Currency is required'),
  frequency: z.enum(FREQUENCIES, 'Select a frequency'),
  effective_date: z.string().min(1, 'Payday is required'),
})

export const profileSchema = z.object({
  base_currency: z.string().min(1, 'Base currency is required'),
})

export const budgetedExpenseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
  currency: z.string().min(1, 'Currency is required'),
  frequency: z.enum(FREQUENCIES, 'Select a frequency'),
  category: z.enum(EXPENSE_CATEGORIES, 'Select a category'),
  next_due_date: z.string().optional(),
})

export const expenseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
  currency: z.string().min(1, 'Currency is required'),
  category: z.enum(EXPENSE_CATEGORIES, 'Select a category'),
  spent_on: z
    .string()
    .min(1, 'Date is required')
    // Date-only strings parse as UTC midnight, so allow a day of slack —
    // otherwise users in timezones ahead of UTC get "today" rejected as future.
    .refine((v) => new Date(v).getTime() <= Date.now() + 24 * 60 * 60 * 1000, 'Date cannot be in the future'),
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
  current_saved: z,
  interest_rate: z
    .string()
    .refine((v) => v === '' || (!isNaN(Number(v)) && Number(v) >= 0), 'Must be a non-negative number'),
})

export const manualContributionSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
  contributed_on: z
    .string()
    .min(1, 'Date is required')
    // Date-only strings parse as UTC midnight, so allow a day of slack —
    // otherwise users in timezones ahead of UTC get "today" rejected as future.
    .refine((v) => new Date(v).getTime() <= Date.now() + 24 * 60 * 60 * 1000, 'Date cannot be in the future'),
})

export type PayProfileInput = z.infer<typeof payProfileSchema>
export type ManualContributionInput = z.infer<typeof manualContributionSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type BudgetedExpenseInput = z.infer<typeof budgetedExpenseSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>
export type GoalInput = z.infer<typeof goalSchema>
