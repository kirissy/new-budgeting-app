import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GoalsClient } from './GoalsClient'
import type { Frequency } from '@/lib/types'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: payProfile }, { data: goals }, { data: expenses }] =
    await Promise.all([
      supabase.from('profiles').select('base_currency').eq('user_id', user.id).single(),
      supabase.from('pay_profiles').select('frequency').eq('user_id', user.id).single(),
      supabase.from('goals').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('expense_items').select('amount').eq('user_id', user.id),
    ])

  const expensesTotal = (expenses ?? []).reduce((s, e) => s + e.amount, 0)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
        <p className="text-sm text-gray-500 mt-1">Holiday fund, emergency fund, and any custom goal</p>
      </div>
      <GoalsClient
        goals={goals ?? []}
        defaultCurrency={profile?.base_currency ?? 'USD'}
        payFrequency={(payProfile?.frequency ?? 'monthly') as Frequency}
        expensesTotal={expensesTotal}
      />
    </div>
  )
}
