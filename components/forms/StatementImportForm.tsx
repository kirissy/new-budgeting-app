'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { CURRENCIES } from '@/lib/currencies'
import { CATEGORY_LABELS } from '@/lib/categories'
import { parseStatementFile, bulkCreateExpenses } from '@/app/actions/statementImport'
import type { ParsedTransaction } from '@/lib/statementParser'
import type { ExpenseCategory } from '@/lib/types'

interface Props {
  defaultCurrency: string
  onDone: () => void
}

interface EditableRow extends ParsedTransaction {
  id: string
  include: boolean
}

const currencyOptions = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))
const categoryOptions = Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))
const todayInputValue = () => new Date().toISOString().split('T')[0]

export function StatementImportForm({ defaultCurrency, onDone }: Props) {
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [truncated, setTruncated] = useState(false)
  const [rows, setRows] = useState<EditableRow[]>([])
  const [currency, setCurrency] = useState(defaultCurrency)
  const [importError, setImportError] = useState('')
  const [parsing, startParsing] = useTransition()
  const [importing, startImporting] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError('')

    const formData = new FormData()
    formData.set('file', file)
    startParsing(async () => {
      const result = await parseStatementFile(formData)
      if (result.error) {
        setParseError(result.error)
        return
      }
      setTruncated(!!result.truncated)
      setRows(
        (result.transactions ?? []).map((t, i) => ({
          ...t,
          id: `${i}-${t.spent_on}-${t.name}`,
          include: true,
        }))
      )
      setStep('review')
    })
  }

  function updateRow(id: string, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function toggleAll(include: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, include })))
  }

  function handleBack() {
    setStep('upload')
    setRows([])
    setFileName('')
    setParseError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleImport() {
    const selected = rows.filter((r) => r.include)
    if (selected.length === 0) {
      setImportError('Select at least one transaction to import')
      return
    }
    setImportError('')
    startImporting(async () => {
      const result = await bulkCreateExpenses(
        selected.map((r) => ({
          name: r.name,
          amount: r.amount,
          currency,
          category: r.category,
          spent_on: r.spent_on,
        }))
      )
      if (result.error) {
        setImportError(result.error)
        return
      }
      onDone()
    })
  }

  const selectedCount = rows.filter((r) => r.include).length

  if (step === 'upload') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          Upload a bank statement (CSV or PDF) and we&apos;ll try to detect the individual transactions. You&apos;ll get a chance to review, edit, and select which ones to import before anything is saved.
        </p>
        <label
          htmlFor="statement-file"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-6 py-10 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/40 transition-colors"
        >
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            {parsing ? 'Reading file…' : fileName || 'Click to choose a CSV or PDF file'}
          </span>
          <span className="text-xs text-gray-400">Max 5MB</span>
          <input
            ref={fileInputRef}
            id="statement-file"
            type="file"
            accept=".csv,.pdf,text/csv,application/pdf"
            className="hidden"
            disabled={parsing}
            onChange={handleFileChange}
          />
        </label>
        {parseError && <p className="text-sm text-red-600">{parseError}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onDone} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Found {rows.length} transaction{rows.length === 1 ? '' : 's'} in <strong>{fileName}</strong>. Review and edit before importing.
        </p>
        <div className="w-36 flex-shrink-0">
          <Select
            label="Currency"
            name="currency"
            options={currencyOptions}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </div>
      {truncated && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          This file had more transactions than we could show at once — only the first {rows.length} are listed.
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <button type="button" onClick={() => toggleAll(true)} className="hover:text-gray-700">Select all</button>
        <button type="button" onClick={() => toggleAll(false)} className="hover:text-gray-700">Deselect all</button>
        <span className="ml-auto">{selectedCount} of {rows.length} selected</span>
      </div>

      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
          {rows.map((row) => (
            <div key={row.id} className={`flex flex-col gap-2 px-3 py-3 ${row.include ? '' : 'opacity-50'}`}>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={row.include}
                  onChange={(e) => updateRow(row.id, { include: e.target.checked })}
                  className="mt-2.5 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <Input
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    className="text-sm"
                  />
                  <Input
                    type="date"
                    value={row.spent_on}
                    max={todayInputValue()}
                    onChange={(e) => updateRow(row.id, { spent_on: e.target.value })}
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={row.amount}
                    onChange={(e) => updateRow(row.id, { amount: Number(e.target.value) })}
                    prefix={currency}
                    className="text-sm"
                  />
                  <Select
                    options={categoryOptions}
                    value={row.category}
                    onChange={(e) => updateRow(row.id, { category: e.target.value as ExpenseCategory })}
                    className="text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="mt-2 text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {importError && <p className="text-sm text-red-600">{importError}</p>}

      <div className="flex gap-2 pt-1">
        <Button onClick={handleImport} loading={importing} className="flex-1">
          Import {selectedCount} transaction{selectedCount === 1 ? '' : 's'}
        </Button>
        <Button type="button" variant="secondary" onClick={handleBack} disabled={importing}>
          Back
        </Button>
      </div>
    </div>
  )
}
