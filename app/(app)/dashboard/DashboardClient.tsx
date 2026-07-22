'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Select } from '@/components/ui/Select'
import { BudgetDonut } from '@/components/dashboard/BudgetDonut'
import { GoalCard } from '@/components/dashboard/GoalCard'
import { WarningBanner } from '@/components/dashboard/WarningBanner'
import { ExpenseBudgetComparison } from '@/components/dashboard/ExpenseBudgetComparison'
import { ViewPeriodSelector } from '@/components/dashboard/ViewPeriodSelector'
import { formatCurrency, convertCurrency, CURRENCIES } from '@/lib/currencies'
import { calculateBudget } from '@/lib/calculations'
import { defaultViewSelection, resolveViewRange, projectToRange, isWithinRange } from '@/lib/viewPeriod'
import type { ViewMode, ViewSelection } from '@/lib/viewPeriod'
import type { BudgetedExpense, BudgetBreakdown, Expense, Goal, PayProfile, Profile } from '@/lib/types'

const currencyOptions = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))

const PERIOD_PHRASE: Record<ViewMode, string> = {
  pay_cycle: 'this cycle',
  weekly: 'this week',
  monthly: 'this month',
  yearly: 'this year',
  all: 'all time',
  custom: 'this period',
}

interface Props {
  profile: Profile
  payProfile: PayProfile
  budgetedExpenses: BudgetedExpense[]
  goals: Goal[]
  expenses: Pick<Expense, 'amount' | 'currency' | 'spent_on'>[]
  rates: Record<string, number>
}

export function DashboardClient({ profile, payProfile, budgetedExpenses, goals, expenses, rates }: Props) {
  const [view, setView] = useState<ViewSelection>(defaultViewSelection(true))
  const [displayCurrency, setDisplayCurrency] = useState(profile.base_currency)

  const today = new Date()
  const payFreq = payProfile.frequency

  const range = useMemo(
    () => resolveViewRange(view, new Date(payProfile.effective_date), payFreq, new Date()),
    [view, payProfile.effective_date, payFreq]
  )

  const breakdown = calculateBudget(payProfile, budgetedExpenses, goals, rates, profile.base_currency, today)

  function project(amountInBase: number) {
    return convertCurrency(
      projectToRange(amountInBase, payFreq, range),
      profile.base_currency,
      displayCurrency,
      rates
    )
  }

  const displayBreakdown: BudgetBreakdown = {
    income: project(breakdown.income),
    budgetedExpensesTotal: project(breakdown.budgetedExpensesTotal),
    normalizedBudgetedExpenses: breakdown.normalizedBudgetedExpenses.map((e) => ({
      ...e,
      perCycleAmountInBase: project(e.perCycleAmountInBase),
    })),
    goalContributions: breakdown.goalContributions.map((gc) => ({
      ...gc,
      contributionInBase: project(gc.contributionInBase),
    })),
    totalGoals: project(breakdown.totalGoals),
    remaining: project(breakdown.remaining),
    isNegative: breakdown.isNegative,
    currency: displayCurrency,
  }

  const actualExpensesTotal = expenses
    .filter((e) => isWithinRange(e.spent_on, range))
    .reduce((sum, e) => sum + convertCurrency(e.amount, e.currency, displayCurrency, rates), 0)

  const remainingColor = displayBreakdown.isNegative ? 'text-red-600' : 'text-emerald-600'

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {payProfile.frequency.charAt(0).toUpperCase() + payProfile.frequency.slice(1)} pay cycle ·{' '}
            {profile.base_currency}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <ViewPeriodSelector value={view} onChange={setView} hasPayCycle range={range} />
          <div className="w-40">
            <Select
              label="Currency"
              options={currencyOptions}
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value)}
            />
          </div>
        </div>
      </div>

      {displayBreakdown.isNegative && (
        <div className="mb-6">
          <WarningBanner amount={displayBreakdown.remaining} currency={displayCurrency} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Income', value: displayBreakdown.income, color: 'text-violet-700' },
          { label: 'Budgeted Expenses', value: displayBreakdown.budgetedExpensesTotal, color: 'text-indigo-600' },
          { label: 'Remaining', value: displayBreakdown.remaining, color: remainingColor },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500">{item.label}</p>
            <p className={`text-lg font-bold mt-1 ${item.color}`}>
              {formatCurrency(item.value, displayCurrency)}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <ExpenseBudgetComparison
          actualTotal={actualExpensesTotal}
          budgetedTotal={displayBreakdown.budgetedExpensesTotal}
          currency={displayCurrency}
          cycleStart={range.start}
          cycleEnd={range.end}
          periodLabel={PERIOD_PHRASE[view.mode]}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <BudgetDonut breakdown={displayBreakdown} />

        <div className="flex flex-col gap-4">
          {breakdown.goalContributions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-gray-500 text-sm">No goals yet.</p>
              <Link href="/goals" className="text-violet-600 text-sm font-medium mt-1 inline-block hover:text-violet-700">
                Add a goal →
              </Link>
            </div>
          ) : (
            breakdown.goalContributions.map((gc) => (
              <GoalCard
                key={gc.goal.id}
                gc={gc}
                payFreq={payFreq}
                viewMode={view.mode}
                range={range}
                displayCurrency={displayCurrency}
                rates={rates}
              />
            ))
          )}
        </div>
      </div>

      {!budgetedExpenses.length && !goals.length && (
        <div className="mt-6 bg-violet-50 rounded-2xl border border-violet-100 p-6">
          <h3 className="font-semibold text-violet-900">Complete your setup</h3>
          <p className="text-sm text-violet-700 mt-1">Add your budgeted expenses and goals to get your full budget breakdown.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link href="/budgeted-expenses" className="text-sm bg-white text-violet-700 border border-violet-200 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-50 transition-colors">
              + Add budgeted expenses
            </Link>
            <Link href="/goals" className="text-sm bg-white text-violet-700 border border-violet-200 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-50 transition-colors">
              + Add goals
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
