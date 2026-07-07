import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GoalsClient } from './GoalsClient'
import { normalizeToCycle } from '@/lib/calculations'
import type { Frequency, GoalContributionLog } from '@/lib/types'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: payProfile }, { data: goals }, { data: expenses }, { data: contributions }] =
    await Promise.all([
      supabase.from('profiles').select('base_currency').eq('user_id', user.id).single(),
      supabase.from('pay_profiles').select('frequency, effective_date').eq('user_id', user.id).single(),
      supabase.from('goals').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('expenses').select('amount, frequency, active').eq('user_id', user.id),
      supabase
        .from('goal_contributions')
        .select('*')
        .eq('user_id', user.id)
        .order('contributed_on', { ascending: false }),
    ])

  const payFrequency = (payProfile?.frequency ?? 'monthly') as Frequency
  const expensesTotal = (expenses ?? [])
    .filter((e) => e.active)
    .reduce((s, e) => s + normalizeToCycle(e.amount, e.frequency as Frequency, payFrequency), 0)

  const contributionsByGoal = (contributions ?? []).reduce<Record<string, GoalContributionLog[]>>(
    (acc, c) => {
      ;(acc[c.goal_id] ??= []).push(c)
      return acc
    },
    {}
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
        <p className="text-sm text-gray-500 mt-1">Holiday fund, emergency fund, and any custom goal</p>
      </div>
      <GoalsClient
        goals={goals ?? []}
        defaultCurrency={profile?.base_currency ?? 'USD'}
        payFrequency={payFrequency}
        payAnchor={payProfile?.effective_date ?? null}
        expensesTotal={expensesTotal}
        contributionsByGoal={contributionsByGoal}
      />
    </div>
  )
}
