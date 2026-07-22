import { differenceInDays, addDays, startOfWeek, addWeeks, startOfMonth, addMonths, startOfYear, addYears } from 'date-fns'
import type {
  BudgetedExpense,
  BudgetedExpenseNormalized,
  BudgetBreakdown,
  Frequency,
  Goal,
  GoalContribution,
  PayProfile,
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

// Selectable dashboard view periods — a subset of Frequency, with "annually"
// relabeled "Yearly" to match how users refer to it when picking a view.
export const VIEW_PERIODS = ['weekly', 'biweekly', 'monthly', 'annually'] as const satisfies readonly Frequency[]

export const VIEW_PERIOD_LABELS: Record<Frequency, string> = {
  ...FREQUENCY_LABELS,
  annually: 'Yearly',
}

export function getCurrentCycle(anchor: Date, freq: Frequency, today: Date): { start: Date; end: Date } {
  const daysPerCycle = Math.round(365 / ANNUAL_MULTIPLIERS[freq])
  let end = new Date(anchor)
  while (end <= today) {
    end = addDays(end, daysPerCycle)
  }
  const start = addDays(end, -daysPerCycle)
  return { start, end }
}

export function getCalendarPeriod(period: Frequency, today: Date): { start: Date; end: Date } {
  switch (period) {
    case 'weekly':
      return {
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }),
      }
    case 'biweekly':
      return { start: addDays(today, -13), end: addDays(today, 1) }
    case 'monthly':
      return { start: startOfMonth(today), end: startOfMonth(addMonths(today, 1)) }
    case 'annually':
      return { start: startOfYear(today), end: startOfYear(addYears(today, 1)) }
    default:
      return { start: startOfMonth(today), end: startOfMonth(addMonths(today, 1)) }
  }
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

  const nominalAnnualRate = goal.interest_rate / 100
  const periodRate = nominalAnnualRate === 0 ? 0 : Math.pow(1 + nominalAnnualRate, 1 / ANNUAL_MULTIPLIERS[payFreq]) - 1
  let contribution:number

  if (periodRate === 0) {
    contribution = remainingAmount / remainingCycles
  } else {
    const growthFactor = Math.pow(1 + periodRate, remainingCycles)
    const futureValueOfSavings = goal.current_saved*growthFactor
    const annuityFactor = (growthFactor - 1) / periodRate
    contribution = (goal.target_amount - futureValueOfSavings) / annuityFactor
  }
  
  contribution = Math.max(0, contribution)

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

export function normalizeBudgetedExpense(
  expense: BudgetedExpense,
  payFreq: Frequency,
  rates: Record<string, number>,
  baseCurrency: string
): BudgetedExpenseNormalized {
  const perCycleAmount = normalizeToCycle(expense.amount, expense.frequency, payFreq)
  const perCycleAmountInBase = convertCurrency(perCycleAmount, expense.currency, baseCurrency, rates)
  return { ...expense, perCycleAmount, perCycleAmountInBase }
}

export function calculateBudget(
  payProfile: PayProfile,
  budgetedExpenses: BudgetedExpense[],
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

  const normalizedBudgetedExpenses = budgetedExpenses.filter((e) => e.active).map((e) =>
    normalizeBudgetedExpense(e, payProfile.frequency, rates, baseCurrency)
  )
  const budgetedExpensesTotal = normalizedBudgetedExpenses.reduce((sum, e) => sum + e.perCycleAmountInBase, 0)

  const goalContributions = goals.map((g) =>
    calculateGoalContribution(g, payProfile.frequency, today, rates, baseCurrency)
  )
  const totalGoals = goalContributions.reduce((sum, gc) => sum + gc.contributionInBase, 0)

  const remaining = income - budgetedExpensesTotal - totalGoals

  return {
    income,
    budgetedExpensesTotal,
    normalizedBudgetedExpenses,
    goalContributions,
    totalGoals,
    remaining,
    isNegative: remaining < 0,
    currency: baseCurrency,
  }
}

export function getPercentage(amount: number, income: number): number {
  if (income === 0) return 0
  return Math.round((amount / income) * 100 * 10) / 10
}
