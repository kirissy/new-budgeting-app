'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { billSchema } from '@/lib/schemas'

export async function createBill(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = billSchema.safeParse({
    name: formData.get('name'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    frequency: formData.get('frequency'),
    next_due_date: formData.get('next_due_date') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('bills').insert({
    user_id: user.id,
    name: parsed.data.name,
    amount: Number(parsed.data.amount),
    currency: parsed.data.currency,
    frequency: parsed.data.frequency,
    next_due_date: parsed.data.next_due_date || null,
    active: true,
  })

  if (error) return { error: error.message }
  revalidatePath('/bills')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateBill(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = billSchema.safeParse({
    name: formData.get('name'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    frequency: formData.get('frequency'),
    next_due_date: formData.get('next_due_date') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('bills')
    .update({
      name: parsed.data.name,
      amount: Number(parsed.data.amount),
      currency: parsed.data.currency,
      frequency: parsed.data.frequency,
      next_due_date: parsed.data.next_due_date || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/bills')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleBillActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('bills')
    .update({ active })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/bills')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteBill(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/bills')
  revalidatePath('/dashboard')
  return { success: true }
}
