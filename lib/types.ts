export type Frequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'semi-monthly'
  | 'monthly'
  | 'quarterly'
  | 'annually'

export type GoalType = 'holiday' | 'emergency' | 'custom'

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

export interface ExpenseItem {
  id: string
  user_id: string
  name: string
  amount: number
  currency: string
  created_at: string
}

export interface Bill {
  id: string
  user_id: string
  name: string
  amount: number
  currency: string
  frequency: Frequency
  next_due_date: string | null
  active: boolean
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
  created_at: string
  updated_at: string
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
  expensesTotal: number
  billsTotal: number
  goalContributions: GoalContribution[]
  totalGoals: number
  investment: number
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

export interface BillNormalized extends Bill {
  perCycleAmount: number
  perCycleAmountInBase: number
}
