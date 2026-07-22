'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { importedExpenseSchema } from '@/lib/schemas'
import { parseCsvStatement, parsePdfStatement, type ParsedTransaction } from '@/lib/statementParser'

const MAX_FILE_BYTES = 5 * 1024 * 1024

export async function parseStatementFile(formData: FormData): Promise<{
  transactions?: ParsedTransaction[]
  truncated?: boolean
  error?: string
}> {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'No file provided' }
  if (file.size === 0) return { error: 'The file is empty' }
  if (file.size > MAX_FILE_BYTES) return { error: 'File is too large (max 5MB)' }

  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  const isCsv = file.type === 'text/csv' || /\.csv$/i.test(file.name)

  if (isCsv) {
    const text = await file.text()
    const result = parseCsvStatement(text)
    if (result.error) return { error: result.error }
    if (result.transactions.length === 0) {
      return { error: 'No transactions found in this CSV.' }
    }
    return { transactions: result.transactions, truncated: result.truncated }
  }

  if (isPdf) {
    const { getDocumentProxy, extractTextItems } = await import('unpdf')
    const buffer = new Uint8Array(await file.arrayBuffer())
    let items
    try {
      const pdf = await getDocumentProxy(buffer)
      ;({ items } = await extractTextItems(pdf))
    } catch {
      return { error: 'Could not read this PDF. It may be scanned or password-protected.' }
    }
    const result = parsePdfStatement(items)
    if (result.transactions.length === 0) {
      return { error: "Couldn't automatically detect transactions in this PDF. Try exporting your statement as CSV instead." }
    }
    return { transactions: result.transactions, truncated: result.truncated }
  }

  return { error: 'Unsupported file type — upload a CSV or PDF bank statement.' }
}

export async function bulkCreateExpenses(items: unknown[]): Promise<{ error?: string; success?: boolean; imported?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  if (!Array.isArray(items) || items.length === 0) return { error: 'No transactions to import' }

  const rows = []
  for (const item of items) {
    const parsed = importedExpenseSchema.safeParse(item)
    if (!parsed.success) continue
    rows.push({
      user_id: user.id,
      name: parsed.data.name,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      category: parsed.data.category,
      spent_on: parsed.data.spent_on,
    })
  }
  if (rows.length === 0) return { error: 'None of the selected rows were valid' }

  const { error } = await supabase.from('expenses').insert(rows)
  if (error) return { error: error.message }

  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { success: true, imported: rows.length }
}
