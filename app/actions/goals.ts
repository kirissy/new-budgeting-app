'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { goalSchema, manualContributionSchema } from '@/lib/schemas'

export async function createGoal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = goalSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    target_amount: formData.get('target_amount'),
    currency: formData.get('currency'),
    target_date: formData.get('target_date') || undefined,
    current_saved: formData.get('current_saved') || '0',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('goals').insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    target_amount: Number(parsed.data.target_amount),
    currency: parsed.data.currency,
    target_date: parsed.data.target_date || null,
    current_saved: Number(parsed.data.current_saved) || 0,
  })

  if (error) return { error: error.message }
  revalidatePath('/goals')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateGoal(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = goalSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    target_amount: formData.get('target_amount'),
    currency: formData.get('currency'),
    target_date: formData.get('target_date') || undefined,
    current_saved: formData.get('current_saved') || '0',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('goals')
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      target_amount: Number(parsed.data.target_amount),
      currency: parsed.data.currency,
      target_date: parsed.data.target_date || null,
      current_saved: Number(parsed.data.current_saved) || 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/goals')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function addGoalContribution(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = manualContributionSchema.safeParse({
    amount: formData.get('amount'),
    contributed_on: formData.get('contributed_on'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data: goal, error: fetchError } = await supabase
    .from('goals')
    .select('current_saved')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (fetchError || !goal) return { error: fetchError?.message ?? 'Goal not found' }

  const amount = Number(parsed.data.amount)

  const { error: insertError } = await supabase.from('goal_contributions').insert({
    goal_id: id,
    user_id: user.id,
    amount,
    source: 'manual',
    contributed_on: parsed.data.contributed_on,
  })
  if (insertError) return { error: insertError.message }

  const { error: updateError } = await supabase
    .from('goals')
    .update({
      current_saved: goal.current_saved + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
  if (updateError) return { error: updateError.message }

  revalidatePath('/goals')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteGoal(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/goals')
  revalidatePath('/dashboard')
  return { success: true }
}
