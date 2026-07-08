import { addDays } from 'date-fns'
import { createServiceClient } from '@/lib/supabase/service'
import { calculateGoalContribution, getNextPayDate } from '@/lib/calculations'
import type { Frequency, Goal } from '@/lib/types'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date()

  const { data: payProfiles, error: payProfilesError } = await supabase
    .from('pay_profiles')
    .select('user_id, frequency, effective_date')
  if (payProfilesError) {
    return Response.json({ error: payProfilesError.message }, { status: 500 })
  }

  let depositsMade = 0
  let goalsProcessed = 0

  for (const payProfile of payProfiles ?? []) {
    const anchor = new Date(payProfile.effective_date)
    const freq = payProfile.frequency as Frequency

    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', payProfile.user_id)
      .not('target_date', 'is', null)
    if (goalsError || !goals) continue

    for (const goal of goals as Goal[]) {
      if (goal.current_saved >= goal.target_amount) continue
      goalsProcessed++

      let currentSaved = goal.current_saved
      let lastDepositDate: Date | null = null
      const searchFrom = goal.last_deposit_date
        ? addDays(new Date(goal.last_deposit_date), 1)
        : new Date(goal.created_at)
      let nextPayDate = getNextPayDate(anchor, freq, searchFrom)

      while (nextPayDate <= today && currentSaved < goal.target_amount) {
        const contribution = calculateGoalContribution(
          { ...goal, current_saved: currentSaved },
          freq,
          nextPayDate,
          {},
          goal.currency
        )
        if (contribution.contribution <= 0) break

        const amount = Math.min(contribution.contribution, goal.target_amount - currentSaved)
        const contributedOn = nextPayDate.toISOString().split('T')[0]

        const { error: insertError } = await supabase.from('goal_contributions').insert({
          goal_id: goal.id,
          user_id: goal.user_id,
          amount,
          source: 'scheduled',
          contributed_on: contributedOn,
        })
        if (insertError) break

        currentSaved += amount
        lastDepositDate = nextPayDate
        depositsMade++

        nextPayDate = getNextPayDate(anchor, freq, addDays(nextPayDate, 1))
      }

      if (lastDepositDate) {
        await supabase
          .from('goals')
          .update({
            current_saved: currentSaved,
            last_deposit_date: lastDepositDate.toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', goal.id)
      }
    }
  }

  return Response.json({ goalsProcessed, depositsMade })
}
