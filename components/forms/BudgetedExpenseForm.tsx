'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { CURRENCIES, formatCurrency } from '@/lib/currencies'
import { normalizeToCycle, FREQUENCY_LABELS } from '@/lib/calculations'
import { CATEGORY_LABELS } from '@/lib/categories'
import type { BudgetedExpense, ExpenseCategory, Frequency } from '@/lib/types'

const currencyOptions = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))
const frequencyOptions = Object.entries(FREQUENCY_LABELS).map(([v, l]) => ({ value: v, label: l }))
const categoryOptions = Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))

interface Props {
  defaultCurrency: string
  payFrequency: Frequency
  item?: BudgetedExpense
  onSubmit: (formData: FormData) => Promise<{ error?: string; success?: boolean } | void>
  onDone: () => void
}

export function BudgetedExpenseForm({ defaultCurrency, payFrequency, item, onSubmit, onDone }: Props) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [amount, setAmount] = useState(item?.amount?.toString() ?? '')
  const [freq, setFreq] = useState<Frequency>(item?.frequency ?? 'monthly')
  const [currency, setCurrency] = useState(item?.currency ?? defaultCurrency)
  const [category, setCategory] = useState<ExpenseCategory>(item?.category ?? 'other')
  const formRef = useRef<HTMLFormElement>(null)

  const perCycle = amount && !isNaN(Number(amount)) && Number(amount) > 0
    ? normalizeToCycle(Number(amount), freq, payFrequency)
    : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    const data = new FormData(formRef.current)
    setError('')
    startTransition(async () => {
      const result = await onSubmit(data)
      if (result?.error) {
        setError(result.error)
        return
      }
      onDone()
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Name"
        name="name"
        defaultValue={item?.name}
        placeholder="e.g. Netflix, Rent, Food"
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
        <Select
          label="Currency"
          name="currency"
          options={currencyOptions}
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        />
      </div>
      <Select
        label="Frequency"
        name="frequency"
        options={frequencyOptions}
        value={freq}
        onChange={(e) => setFreq(e.target.value as Frequency)}
      />
      <Select
        label="Category"
        name="category"
        options={categoryOptions}
        value={category}
        onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
      />
      <Input
        label="Next due date (optional)"
        name="next_due_date"
        type="date"
        defaultValue={item?.next_due_date ?? ''}
      />
      {perCycle !== null && (
        <div className="rounded-lg bg-violet-50 border border-violet-100 px-4 py-3 text-sm text-violet-800">
          ≈ <strong>{formatCurrency(perCycle, currency)}</strong> per {FREQUENCY_LABELS[payFrequency].toLowerCase()} paycheck
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={pending} className="flex-1">
          {item ? 'Save changes' : 'Add budgeted expense'}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
