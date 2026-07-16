'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { CURRENCIES } from '@/lib/currencies'
import { CATEGORY_LABELS } from '@/lib/categories'
import { parseBankCsv, type ParsedRow } from '@/lib/importExpenses'
import { bulkCreateExpenses } from '@/app/actions/expenses'
import type { ExpenseCategory, BudgetedExpense } from '@/lib/types'

const currencyOptions = CURRENCIES.map((c) => c.code)
const categoryOptions = Object.entries(CATEGORY_LABELS)

interface Props {
  defaultCurrency: string
  budgetedExpenses: BudgetedExpense[]
  onDone: () => void
}

export function ImportExpensesModal({ defaultCurrency, budgetedExpenses, onDone }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ imported: number; skipped: string[] } | null>(null)
  const [pending, startTransition] = useTransition()

  const visibleRows = useMemo(
    () => (showAll ? rows : rows.filter((r) => r.amount < 0)),
    [rows, showAll]
  )
  const hiddenCount = rows.length - rows.filter((r) => r.amount < 0).length
  const included = rows.filter((r) => r.include)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setResult(null)
    file.text().then((text) => {
      const parsed = parseBankCsv(text, defaultCurrency)
      if (parsed.length === 0) setError('No rows found in this file.')
      setRows(parsed)
    })
  }

  function updateRow(id: string, patch: Partial<ParsedRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function linkToBudgetedExpense(rowId: string, budgetedExpenseId: string) {
    if (!budgetedExpenseId) {
      updateRow(rowId, { budgetedExpenseId: null })
      return
    }
    const match = budgetedExpenses.find((b) => b.id === budgetedExpenseId)
    if (!match) return
    updateRow(rowId, { budgetedExpenseId, category: match.category })
  }

  function handleImport() {
    setError('')
    startTransition(async () => {
      const payload = included.map((r) => ({
        name: r.description.slice(0, 100),
        amount: Math.abs(r.amount).toString(),
        currency: r.currency,
        category: r.category,
        spent_on: r.date,
      }))
      const res = await bulkCreateExpenses(payload)
      if (res.error) {
        setError(res.error)
        return
      }
      setResult({ imported: res.imported, skipped: res.skipped })
    })
  }

  if (result) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-700">
          Imported {result.imported} expense{result.imported === 1 ? '' : 's'}.
        </p>
        {result.skipped.length > 0 && (
          <div className="text-xs text-red-600">
            {result.skipped.length} row(s) failed validation:
            <ul className="list-disc list-inside mt-1">
              {result.skipped.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}
        <Button onClick={onDone}>Done</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="file" accept=".csv" onChange={handleFile} className="text-sm" />

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{included.length} of {rows.length} rows will be imported.</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
              Show all transactions{!showAll && hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ''}
            </label>
          </div>

          <div className="max-h-96 overflow-y-auto border border-gray-100 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left text-gray-500">
                  <th className="p-2 w-8"></th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Description</th>
                  <th className="p-2 w-24">Amount</th>
                  <th className="p-2 w-20">Currency</th>
                  <th className="p-2">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleRows.map((row) => (
                  <tr key={row.id} className={row.amount >= 0 ? 'bg-gray-50/60' : ''}>
                    <td className="p-2 align-top pt-3">
                      <input
                        type="checkbox"
                        checked={row.include}
                        disabled={!row.date}
                        onChange={(e) => updateRow(row.id, { include: e.target.checked })}
                      />
                    </td>
                    <td className="p-2 whitespace-nowrap align-top pt-3">
                      {row.date || `⚠ ${row.rawDate}`}
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(row.id, { description: e.target.value })}
                        className="w-full text-xs border border-gray-200 rounded px-1.5 py-1"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.amount}
                        onChange={(e) => updateRow(row.id, { amount: Number(e.target.value) })}
                        className="w-full text-xs border border-gray-200 rounded px-1.5 py-1"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={row.currency}
                        onChange={(e) => updateRow(row.id, { currency: e.target.value })}
                        className="w-full text-xs border border-gray-200 rounded px-1 py-1"
                      >
                        {currencyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select
                        value={row.category}
                        onChange={(e) => updateRow(row.id, { category: e.target.value as ExpenseCategory, budgetedExpenseId: null })}
                        className="w-full text-xs border border-gray-200 rounded px-1 py-1"
                      >
                        {categoryOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleImport} loading={pending} disabled={included.length === 0} className="flex-1">
          Import {included.length > 0 ? `${included.length} expense${included.length === 1 ? '' : 's'}` : ''}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  )
}