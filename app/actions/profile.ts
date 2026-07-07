'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { profileSchema, payProfileSchema } from '@/lib/schemas'

export async function upsertProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = profileSchema.safeParse({ base_currency: formData.get('base_currency') })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('profiles').upsert({
    user_id: user.id,
    base_currency: parsed.data.base_currency,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function upsertPayProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = payProfileSchema.safeParse({
    income_amount: formData.get('income_amount'),
    currency: formData.get('currency'),
    frequency: formData.get('frequency'),
    effective_date: formData.get('effective_date'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('pay_profiles').upsert({
    user_id: user.id,
    income_amount: Number(parsed.data.income_amount),
    currency: parsed.data.currency,
    frequency: parsed.data.frequency,
    effective_date: parsed.data.effective_date,
  }, { onConflict: 'user_id' })

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { success: true }
}
