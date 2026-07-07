import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { calculateBudget } from '@/lib/calculations'
import { formatCurrency } from '@/lib/currencies'
import { BudgetDonut } from '@/components/dashboard/BudgetDonut'
import { GoalCard } from '@/components/dashboard/GoalCard'
import { WarningBanner } from '@/components/dashboard/WarningBanner'
import type { Frequency } from '@/lib/types'

async function getExchangeRates(baseCurrency: string): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('exchange_rates')
    .select('target_currency, rate')
    .eq('base_currency', baseCurrency)

  const rates: Record<string, number> = { [baseCurrency]: 1 }
  data?.forEach((r) => { rates[r.target_currency] = r.rate })
  return rates
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: payProfile },
    { data: expenses },
    { data: bills },
    { data: goals },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('pay_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('expense_items').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('bills').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('goals').select('*').eq('user_id', user.id).order('created_at'),
  ])

  if (!profile || !payProfile) {
    redirect('/onboarding')
  }

  const rates = await getExchangeRates(profile.base_currency)

  const breakdown = calculateBudget(
    payProfile,
    expenses ?? [],
    bills ?? [],
    goals ?? [],
    rates,
    profile.base_currency,
    new Date()
  )

  const investmentColor = breakdown.isNegative ? 'text-red-600' : 'text-emerald-600'

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
          <WarningBanner amount={breakdown.investment} currency={profile.base_currency} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Income', value: breakdown.income, color: 'text-violet-700' },
          { label: 'Expenses', value: breakdown.expensesTotal, color: 'text-indigo-600' },
          { label: 'Bills', value: breakdown.billsTotal, color: 'text-sky-600' },
          { label: 'Investment', value: breakdown.investment, color: investmentColor },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-medium text-gray-500">{item.label}</p>
            <p className={`text-lg font-bold mt-1 ${item.color}`}>
              {formatCurrency(item.value, profile.base_currency)}
            </p>
          </div>
        ))}
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

      {!expenses?.length && !bills?.length && !goals?.length && (
        <div className="mt-6 bg-violet-50 rounded-2xl border border-violet-100 p-6">
          <h3 className="font-semibold text-violet-900">Complete your setup</h3>
          <p className="text-sm text-violet-700 mt-1">Add your expenses, bills, and goals to get your full budget breakdown.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link href="/expenses" className="text-sm bg-white text-violet-700 border border-violet-200 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-50 transition-colors">
              + Add expenses
            </Link>
            <Link href="/bills" className="text-sm bg-white text-violet-700 border border-violet-200 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-50 transition-colors">
              + Add bills
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
