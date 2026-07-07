'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { expenseSchema } from '@/lib/schemas'

export async function createExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = expenseSchema.safeParse({
    name: formData.get('name'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    frequency: formData.get('frequency'),
    next_due_date: formData.get('next_due_date') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('expenses').insert({
    user_id: user.id,
    name: parsed.data.name,
    amount: Number(parsed.data.amount),
    currency: parsed.data.currency,
    frequency: parsed.data.frequency,
    next_due_date: parsed.data.next_due_date || null,
    active: true,
  })

  if (error) return { error: error.message }
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateExpense(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = expenseSchema.safeParse({
    name: formData.get('name'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    frequency: formData.get('frequency'),
    next_due_date: formData.get('next_due_date') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('expenses')
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
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleExpenseActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('expenses')
    .update({ active })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { success: true }
}
