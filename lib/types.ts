export type Frequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'semi-monthly'
  | 'monthly'
  | 'quarterly'
  | 'annually'

export type GoalType = 'holiday' | 'emergency' | 'custom'

export type ExpenseCategory =
  | 'food_dining'
  | 'groceries'
  | 'transport'
  | 'housing'
  | 'utilities'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'travel'
  | 'other'

export interface Profile {
  id: string
  user_id: string
  base_currency: string
  created_at: string
  updated_at: string
}

export interface PayProfile {
  id: string
  user_id: string
  income_amount: number
  currency: string
  frequency: Frequency
  effective_date: string
  created_at: string
}

export interface BudgetedExpense {
  id: string
  user_id: string
  name: string
  amount: number
  currency: string
  frequency: Frequency
  category: ExpenseCategory
  next_due_date: string | null
  active: boolean
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  name: string
  amount: number
  currency: string
  category: ExpenseCategory
  spent_on: string
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  type: GoalType
  name: string
  target_amount: number
  currency: string
  target_date: string | null
  current_saved: number
  last_deposit_date: string | null
  created_at: string
  updated_at: string
}

export type ContributionSource = 'scheduled' | 'manual'

export interface GoalContributionLog {
  id: string
  goal_id: string
  user_id: string
  amount: number
  source: ContributionSource
  contributed_on: string
  created_at: string
}

export interface ExchangeRate {
  id: string
  base_currency: string
  target_currency: string
  rate: number
  fetched_at: string
}

export interface BudgetBreakdown {
  income: number
  budgetedExpensesTotal: number
  normalizedBudgetedExpenses: BudgetedExpenseNormalized[]
  goalContributions: GoalContribution[]
  totalGoals: number
  remaining: number
  isNegative: boolean
  currency: string
}

export interface GoalContribution {
  goal: Goal
  contribution: number
  status: 'on-track' | 'achieved' | 'overdue' | 'no-date'
  remainingCycles: number
  remainingAmount: number
  contributionInBase: number
}

export interface BudgetedExpenseNormalized extends BudgetedExpense {
  perCycleAmount: number
  perCycleAmountInBase: number
}
