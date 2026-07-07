'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { expenseItemSchema } from '@/lib/schemas'

export async function createExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = expenseItemSchema.safeParse({
    name: formData.get('name'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('expense_items').insert({
    user_id: user.id,
    name: parsed.data.name,
    amount: Number(parsed.data.amount),
    currency: parsed.data.currency,
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

  const parsed = expenseItemSchema.safeParse({
    name: formData.get('name'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('expense_items')
    .update({
      name: parsed.data.name,
      amount: Number(parsed.data.amount),
      currency: parsed.data.currency,
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
    .from('expense_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { success: true }
}
