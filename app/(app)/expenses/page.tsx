import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getExchangeRates } from '@/lib/exchangeRates'
import { ExpensesClient } from './ExpensesClient'
import type { BudgetedExpense, Frequency } from '@/lib/types'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: payProfile }, { data: expenses }, { data: budgetedExpenses }] =
    await Promise.all([
      supabase.from('profiles').select('base_currency').eq('user_id', user.id).single(),
      supabase.from('pay_profiles').select('frequency, effective_date').eq('user_id', user.id).single(),
      supabase.from('expenses').select('*').eq('user_id', user.id).order('spent_on', { ascending: false }),
      supabase.from('budgeted_expenses').select('amount, currency, frequency, active').eq('user_id', user.id),
    ])

  const baseCurrency = profile?.base_currency ?? 'USD'
  const payFrequency = (payProfile?.frequency ?? 'monthly') as Frequency
  const rates = await getExchangeRates(baseCurrency)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <p className="text-sm text-gray-500 mt-1">Log every expense as it happens</p>
      </div>
      <ExpensesClient
        expenses={expenses ?? []}
        defaultCurrency={baseCurrency}
        payFrequency={payFrequency}
        payAnchor={payProfile?.effective_date ?? null}
        budgetedExpenses={(budgetedExpenses ?? []) as Pick<BudgetedExpense, 'amount' | 'currency' | 'frequency' | 'active'>[]}
        rates={rates}
      />
    </div>
  )
}
