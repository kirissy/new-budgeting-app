import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getExchangeRates } from '@/lib/exchangeRates'
import { getCurrentCycle, normalizeToCycle } from '@/lib/calculations'
import { convertCurrency } from '@/lib/currencies'
import { ExpenseBudgetComparison } from '@/components/dashboard/ExpenseBudgetComparison'
import { ExpensesClient } from './ExpensesClient'
import type { Frequency } from '@/lib/types'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: payProfile }, { data: expenses }, { data: budgetedExpenses }] =
    await Promise.all([
      supabase.from('profiles').select('base_currency').eq('user_id', user.id).single(),
      supabase.from('pay_profiles').select('frequency, effective_date').eq('user_id', user.id).single(),
      supabase.from('expenses').select('*').eq('user_id', user.id).order('spent_on', { ascending: false }),
      supabase.from('budgeted_expenses').select('*').eq('user_id', user.id),
    ])

  const baseCurrency = profile?.base_currency ?? 'USD'
  const payFrequency = (payProfile?.frequency ?? 'monthly') as Frequency
  const rates = await getExchangeRates(baseCurrency)

  const budgetedTotal = (budgetedExpenses ?? [])
    .filter((e) => e.active)
    .reduce((sum, e) => {
      const perCycle = normalizeToCycle(e.amount, e.frequency as Frequency, payFrequency)
      return sum + convertCurrency(perCycle, e.currency, baseCurrency, rates)
    }, 0)

  let cycleStart = new Date()
  let cycleEnd = new Date()
  let actualTotal = 0

  if (payProfile?.effective_date) {
    const cycle = getCurrentCycle(new Date(payProfile.effective_date), payFrequency, new Date())
    cycleStart = cycle.start
    cycleEnd = cycle.end
    actualTotal = (expenses ?? [])
      .filter((e) => {
        const spentOn = new Date(e.spent_on)
        return spentOn >= cycleStart && spentOn < cycleEnd
      })
      .reduce((sum, e) => sum + convertCurrency(e.amount, e.currency, baseCurrency, rates), 0)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <p className="text-sm text-gray-500 mt-1">Log every expense as it happens</p>
      </div>
      <div className="mb-6">
        <ExpenseBudgetComparison
          actualTotal={actualTotal}
          budgetedTotal={budgetedTotal}
          currency={baseCurrency}
          cycleStart={cycleStart}
          cycleEnd={cycleEnd}
        />
      </div>
      <ExpensesClient 
        expenses={expenses ?? []} 
        defaultCurrency={baseCurrency}
        budgetedExpenses={(budgetedExpenses ?? []).filter((b) => b.active)} />
    </div>
  )
}
