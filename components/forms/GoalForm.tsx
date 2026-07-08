'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { CURRENCIES } from '@/lib/currencies'
import type { Goal } from '@/lib/types'

const currencyOptions = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))
const typeOptions = [
  { value: 'holiday', label: 'Holiday fund' },
  { value: 'emergency', label: 'Emergency fund' },
  { value: 'custom', label: 'Custom goal' },
]

interface Props {
  defaultCurrency: string
  expensesTotal?: number
  item?: Goal
  onSubmit: (formData: FormData) => Promise<{ error?: string; success?: boolean } | void>
  onDone: () => void
}

export function GoalForm({ defaultCurrency, expensesTotal, item, onSubmit, onDone }: Props) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [type, setType] = useState<'holiday' | 'emergency' | 'custom'>(item?.type ?? 'custom')
  const [targetAmount, setTargetAmount] = useState(item?.target_amount?.toString() ?? '')
  const formRef = useRef<HTMLFormElement>(null)

  function prefillEmergency(months: number) {
    if (!expensesTotal) return
    setTargetAmount((expensesTotal * months).toFixed(2))
  }

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
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Goal name"
          name="name"
          defaultValue={item?.name}
          placeholder="e.g. Bali trip, Emergency"
          required
          className="col-span-2"
        />
      </div>
      <Select
        label="Type"
        name="type"
        options={typeOptions}
        value={type}
        onChange={(e) => setType(e.target.value as 'holiday' | 'emergency' | 'custom')}
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Input
            label="Target amount"
            name="target_amount"
            type="number"
            step="0.01"
            min="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="0.00"
            required
          />
          {type === 'emergency' && expensesTotal && expensesTotal > 0 && (
            <div className="flex gap-1 mt-1">
              {[3, 6, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => prefillEmergency(m)}
                  className="text-xs text-violet-600 hover:text-violet-700 px-2 py-0.5 rounded bg-violet-50 hover:bg-violet-100 transition-colors"
                >
                  {m}mo
                </button>
              ))}
            </div>
          )}
        </div>
        <Select
          label="Currency"
          name="currency"
          options={currencyOptions}
          defaultValue={item?.currency ?? defaultCurrency}
        />
      </div>
      <Input
        label="Target date (optional)"
        name="target_date"
        type="date"
        defaultValue={item?.target_date ?? ''}
        hint="Needed to calculate per-cycle contribution"
      />
      <Input
        label="Expected annual return (%)"
        name="interest_rate"
        type="number"
        step="0.01"
        min="0"
        defaultValue={item?.interest_rate ?? '0'}
        placeholder="0"
        hint="e.g. a savings account or ETF's expected annual rate. Leave at 0 for no growth assumption."
      />
      <Input
        label="Already saved"
        name="current_saved"
        type="number"
        step="0.01"
        min="0"
        defaultValue={item?.current_saved ?? '0'}
        placeholder="0.00"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={pending} className="flex-1">
          {item ? 'Save changes' : 'Add goal'}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
