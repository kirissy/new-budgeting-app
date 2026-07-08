'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { budgetedExpenseSchema } from '@/lib/schemas'

export async function createBudgetedExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = budgetedExpenseSchema.safeParse({
    name: formData.get('name'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    frequency: formData.get('frequency'),
    category: formData.get('category'),
    next_due_date: formData.get('next_due_date') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('budgeted_expenses').insert({
    user_id: user.id,
    name: parsed.data.name,
    amount: Number(parsed.data.amount),
    currency: parsed.data.currency,
    frequency: parsed.data.frequency,
    category: parsed.data.category,
    next_due_date: parsed.data.next_due_date || null,
    active: true,
  })

  if (error) return { error: error.message }
  revalidatePath('/budgeted-expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateBudgetedExpense(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = budgetedExpenseSchema.safeParse({
    name: formData.get('name'),
    amount: formData.get('amount'),
    currency: formData.get('currency'),
    frequency: formData.get('frequency'),
    category: formData.get('category'),
    next_due_date: formData.get('next_due_date') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase
    .from('budgeted_expenses')
    .update({
      name: parsed.data.name,
      amount: Number(parsed.data.amount),
      currency: parsed.data.currency,
      frequency: parsed.data.frequency,
      category: parsed.data.category,
      next_due_date: parsed.data.next_due_date || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/budgeted-expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleBudgetedExpenseActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('budgeted_expenses')
    .update({ active })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/budgeted-expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteBudgetedExpense(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('budgeted_expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/budgeted-expenses')
  revalidatePath('/dashboard')
  return { success: true }
}
