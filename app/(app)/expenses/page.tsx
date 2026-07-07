import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExpensesClient } from './ExpensesClient'
import type { Frequency } from '@/lib/types'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: payProfile }, { data: expenses }] = await Promise.all([
    supabase.from('profiles').select('base_currency').eq('user_id', user.id).single(),
    supabase.from('pay_profiles').select('frequency').eq('user_id', user.id).single(),
    supabase.from('expenses').select('*').eq('user_id', user.id).order('created_at'),
  ])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <p className="text-sm text-gray-500 mt-1">Recurring costs and subscriptions, normalized to your pay cycle</p>
      </div>
      <ExpensesClient
        expenses={expenses ?? []}
        defaultCurrency={profile?.base_currency ?? 'USD'}
        payFrequency={(payProfile?.frequency ?? 'monthly') as Frequency}
      />
    </div>
  )
}
