import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { calculateBudget, getCurrentCycle } from '@/lib/calculations'
import { formatCurrency, convertCurrency } from '@/lib/currencies'
import { getExchangeRates } from '@/lib/exchangeRates'
import { BudgetDonut } from '@/components/dashboard/BudgetDonut'
import { GoalCard } from '@/components/dashboard/GoalCard'
import { WarningBanner } from '@/components/dashboard/WarningBanner'
import { ExpenseBudgetComparison } from '@/components/dashboard/ExpenseBudgetComparison'
import type { Frequency } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: payProfile },
    { data: budgetedExpenses },
    { data: goals },
    { data: expenses },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('pay_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('budgeted_expenses').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('goals').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('expenses').select('amount, currency, spent_on').eq('user_id', user.id),
  ])

  if (!profile || !payProfile) {
    redirect('/onboarding')
  }

  const rates = await getExchangeRates(profile.base_currency)

  const breakdown = calculateBudget(
    payProfile,
    budgetedExpenses ?? [],
    goals ?? [],
    rates,
    profile.base_currency,
    new Date()
  )

  const cycle = getCurrentCycle(new Date(payProfile.effective_date), payProfile.frequency as Frequency, new Date())
  const actualExpensesTotal = (expenses ?? [])
    .filter((e) => {
      const spentOn = new Date(e.spent_on)
      return spentOn >= cycle.start && spentOn < cycle.end
    })
    .reduce((sum, e) => sum + convertCurrency(e.amount, e.currency, profile.base_currency, rates), 0)

  const remainingColor = breakdown.isNegative ? 'text-red-600' : 'text-emerald-600'

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {payProfile.frequency.charAt(0).toUpperCase() + payProfile.frequency.slice(1)} pay cycle ·{' '}
          {profile.base_currency}
        </p>
      </div>

      {breakdown.isNegative && (
        <div className="mb-6">
          <WarningBanner amount={breakdown.remaining} currency={profile.base_currency} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Income', value: breakdown.income, color: 'text-violet-700' },
          { label: 'Budgeted Expenses', value: breakdown.budgetedExpensesTotal, color: 'text-indigo-600' },
          { label: 'Remaining', value: breakdown.remaining, color: remainingColor },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500">{item.label}</p>
            <p className={`text-lg font-bold mt-1 ${item.color}`}>
              {formatCurrency(item.value, profile.base_currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <ExpenseBudgetComparison
          actualTotal={actualExpensesTotal}
          budgetedTotal={breakdown.budgetedExpensesTotal}
          currency={profile.base_currency}
          cycleStart={cycle.start}
          cycleEnd={cycle.end}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <BudgetDonut breakdown={breakdown} />

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
              <GoalCard key={gc.goal.id} gc={gc} payFreq={payProfile.frequency as Frequency} />
            ))
          )}
        </div>
      </div>

      {!budgetedExpenses?.length && !goals?.length && (
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
