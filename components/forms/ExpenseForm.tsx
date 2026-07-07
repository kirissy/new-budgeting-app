'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { CURRENCIES } from '@/lib/currencies'
import type { ExpenseItem } from '@/lib/types'

const currencyOptions = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))

interface Props {
  defaultCurrency: string
  item?: ExpenseItem
  onSubmit: (formData: FormData) => Promise<{ error?: string; success?: boolean } | void>
  onDone: () => void
}

export function ExpenseForm({ defaultCurrency, item, onSubmit, onDone }: Props) {
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

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
        placeholder="e.g. Food, Gym membership"
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Amount (per cycle)"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          defaultValue={item?.amount}
          placeholder="0.00"
          required
        />
        <Select
          label="Currency"
          name="currency"
          options={currencyOptions}
          defaultValue={item?.currency ?? defaultCurrency}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={pending} className="flex-1">
          {item ? 'Save changes' : 'Add expense'}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
