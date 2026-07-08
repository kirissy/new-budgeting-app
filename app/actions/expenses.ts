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
    category: formData.get('category'),
    spent_on: formData.get('spent_on'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('expenses').insert({
    user_id: user.id,
    name: parsed.data.name,
    amount: Number(parsed.data.amount),
    currency: parsed.data.currency,
    category: parsed.data.category,
    spent_on: parsed.data.spent_on,
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
    category: formData.get('category'),
    spent_on: formData.get('spent_on'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('expenses')
    .update({
      name: parsed.data.name,
      amount: Number(parsed.data.amount),
      currency: parsed.data.currency,
      category: parsed.data.category,
      spent_on: parsed.data.spent_on,
    })
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
