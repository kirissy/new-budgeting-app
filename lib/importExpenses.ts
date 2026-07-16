import Papa from 'papaparse'
import {parse, isValid, format} from 'date-fns'
import type { ExpenseCategory } from './types'

export interface ParsedRow {
    id: string
    date: string              // ISO yyyy-MM-dd, or '' if unparseable
    rawDate: string            // original string, shown if parsing failed
    amount: number             // signed: negative = debit, positive = credit
    description: string
    currency: string
    category: ExpenseCategory
    budgetedExpenseId: string | null // UI-only link, not persisted
    include: boolean
}

const CATEGORY_KEYWORDS: [ExpenseCategory, string[]][] = [
  ['groceries', ['woolworths', 'coles', 'aldi', 'iga']],
  ['food_dining', ['pub', 'restaurant', 'cafe', 'food', 'uber eats', 'doordash', 'menulog']],
  ['entertainment', ['spotify', 'netflix', 'cinema', 'steam', 'disney']],
  ['health', ['chemist', 'pharmacy', 'medical', 'dental', 'health insurance']],
  ['housing', ['rent', 'mortgage', 'home loan', 'levy', 'strata']],
  ['utilities', ['internet', 'electricity', 'gas bill', 'water bill', 'telstra', 'optus']],
  ['transport', ['uber', 'myki', 'opal', 'fuel', 'bp ', 'shell', 'caltex']],
  ['shopping', ['big w', 'kmart', 'target', 'amazon', 'jb hi-fi']],
]

function guessCategory(description: string): ExpenseCategory {
  const lower = description.toLowerCase()
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return category
  }
  return 'other'
}

export function parseBankCsv(csvText: string, defaultCurrency: string): ParsedRow[] {
  const result = Papa.parse<string[]>(csvText, {skipEmptyLines: true})

  return result.data.map((row, i) => {
    const [dateStr, amountStr, description] = row
    const parsedDate = parse((dateStr ?? '').trim(), 'dd/MM/yyyy', new Date())
    const amount = Number ((amountStr ?? '0').trim())

    return {
        id: `row-${i}`,
        date: isValid(parsedDate) ? format(parsedDate, 'yyyy-MM-dd') : '',
        rawDate: dateStr ?? '',
        amount,
        description: (description ?? '').trim(),
        currency: defaultCurrency,
        category: guessCategory(description ?? ''),
        budgetedExpenseId: null,
        include: amount < 0 && isValid(parsedDate),
    }
  })
}