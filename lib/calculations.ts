import { differenceInDays, addDays } from 'date-fns'
import type {
  Bill,
  BillNormalized,
  BudgetBreakdown,
  Frequency,
  Goal,
  GoalContribution,
  PayProfile,
  ExpenseItem,
} from './types'
import { convertCurrency } from './currencies'

export const ANNUAL_MULTIPLIERS: Record<Frequency, number> = {
  daily: 365,
  weekly: 52,
  biweekly: 26,
  'semi-monthly': 24,
  monthly: 12,
  quarterly: 4,
  annually: 1,
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  'semi-monthly': 'Semi-monthly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
}

export function getNextPayDate(anchor: Date, freq: Frequency, from: Date): Date {
  const daysPerCycle = Math.round(365 / ANNUAL_MULTIPLIERS[freq])
  let next = new Date(anchor)
  while (next < from) {
    next = addDays(next, daysPerCycle)
  }
  return next
}

export function normalizeToCycle(
  amount: number,
  sourceFreq: Frequency,
  payFreq: Frequency
): number {
  const annualAmount = amount * ANNUAL_MULTIPLIERS[sourceFreq]
  return annualAmount / ANNUAL_MULTIPLIERS[payFreq]
}

export function calculateGoalContribution(
  goal: Goal,
  payFreq: Frequency,
  today: Date,
  rates: Record<string, number>,
  baseCurrency: string
): GoalContribution {
  const remainingAmount = goal.target_amount - goal.current_saved

  if (remainingAmount <= 0) {
    return {
      goal,
      contribution: 0,
      status: 'achieved',
      remainingCycles: 0,
      remainingAmount: 0,
      contributionInBase: 0,
    }
  }

  if (!goal.target_date) {
    return {
      goal,
      contribution: 0,
      status: 'no-date',
      remainingCycles: 0,
      remainingAmount,
      contributionInBase: 0,
    }
  }

  const targetDate = new Date(goal.target_date)
  const daysRemaining = differenceInDays(targetDate, today)
  const daysPerCycle = 365 / ANNUAL_MULTIPLIERS[payFreq]
  const remainingCycles = Math.floor(daysRemaining / daysPerCycle)

  if (remainingCycles <= 0) {
    const contributionInBase = convertCurrency(
      remainingAmount,
      goal.currency,
      baseCurrency,
      rates
    )
    return {
      goal,
      contribution: remainingAmount,
      status: 'overdue',
      remainingCycles: 0,
      remainingAmount,
      contributionInBase,
    }
  }

  const contribution = remainingAmount / remainingCycles
  const contributionInBase = convertCurrency(contribution, goal.currency, baseCurrency, rates)

  return {
    goal,
    contribution,
    status: 'on-track',
    remainingCycles,
    remainingAmount,
    contributionInBase,
  }
}

export function normalizeBill(
  bill: Bill,
  payFreq: Frequency,
  rates: Record<string, number>,
  baseCurrency: string
): BillNormalized {
  const perCycleAmount = normalizeToCycle(bill.amount, bill.frequency, payFreq)
  const perCycleAmountInBase = convertCurrency(perCycleAmount, bill.currency, baseCurrency, rates)
  return { ...bill, perCycleAmount, perCycleAmountInBase }
}

export function calculateBudget(
  payProfile: PayProfile,
  expenses: ExpenseItem[],
  bills: Bill[],
  goals: Goal[],
  rates: Record<string, number>,
  baseCurrency: string,
  today: Date = new Date()
): BudgetBreakdown {
  const income = convertCurrency(
    payProfile.income_amount,
    payProfile.currency,
    baseCurrency,
    rates
  )

  const expensesTotal = expenses.reduce((sum, e) => {
    return sum + convertCurrency(e.amount, e.currency, baseCurrency, rates)
  }, 0)

  const normalizedBills = bills.filter((b) => b.active).map((b) =>
    normalizeBill(b, payProfile.frequency, rates, baseCurrency)
  )
  const billsTotal = normalizedBills.reduce((sum, b) => sum + b.perCycleAmountInBase, 0)

  const goalContributions = goals.map((g) =>
    calculateGoalContribution(g, payProfile.frequency, today, rates, baseCurrency)
  )
  const totalGoals = goalContributions.reduce((sum, gc) => sum + gc.contributionInBase, 0)

  const investment = income - expensesTotal - billsTotal - totalGoals

  return {
    income,
    expensesTotal,
    billsTotal,
    goalContributions,
    totalGoals,
    investment,
    isNegative: investment < 0,
    currency: baseCurrency,
  }
}

export function getPercentage(amount: number, income: number): number {
  if (income === 0) return 0
  return Math.round((amount / income) * 100 * 10) / 10
}
