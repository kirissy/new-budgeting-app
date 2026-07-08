import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getExchangeRates } from '@/lib/exchangeRates'
import { DashboardClient } from './DashboardClient'

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

  return (
    <DashboardClient
      profile={profile}
      payProfile={payProfile}
      budgetedExpenses={budgetedExpenses ?? []}
      goals={goals ?? []}
      expenses={expenses ?? []}
      rates={rates}
    />
  )
}
