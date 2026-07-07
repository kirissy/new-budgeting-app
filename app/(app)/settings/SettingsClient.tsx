'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { CURRENCIES } from '@/lib/currencies'
import { FREQUENCY_LABELS } from '@/lib/calculations'
import { upsertProfile, upsertPayProfile } from '@/app/actions/profile'
import type { Profile, PayProfile } from '@/lib/types'

const currencyOptions = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))
const frequencyOptions = Object.entries(FREQUENCY_LABELS).map(([v, l]) => ({ value: v, label: l }))

interface Props {
  profile: Profile | null
  payProfile: PayProfile | null
  email: string
}

export function SettingsClient({ profile, payProfile, email }: Props) {
  const [incomeError, setIncomeError] = useState('')
  const [incomeSuccess, setIncomeSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [pending, startTransition] = useTransition()
  const incomeFormRef = useRef<HTMLFormElement>(null)
  const profileFormRef = useRef<HTMLFormElement>(null)

  function handleIncome(e: React.FormEvent) {
    e.preventDefault()
    if (!incomeFormRef.current) return
    const data = new FormData(incomeFormRef.current)
    setIncomeError('')
    setIncomeSuccess(false)
    startTransition(async () => {
      const result = await upsertPayProfile(data)
      if (result?.error) { setIncomeError(result.error); return }
      setIncomeSuccess(true)
    })
  }

  function handleProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profileFormRef.current) return
    const data = new FormData(profileFormRef.current)
    setProfileError('')
    setProfileSuccess(false)
    startTransition(async () => {
      const result = await upsertProfile(data)
      if (result?.error) { setProfileError(result.error); return }
      setProfileSuccess(true)
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Account</h2>
        <p className="text-sm text-gray-500 mb-4">{email}</p>
      </div>

      <form ref={profileFormRef} onSubmit={handleProfile} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Base currency</h2>
        <p className="text-sm text-gray-500">All totals and percentages are shown in this currency.</p>
        <Select
          label="Base currency"
          name="base_currency"
          options={currencyOptions}
          defaultValue={profile?.base_currency ?? 'USD'}
        />
        {profileError && <p className="text-sm text-red-600">{profileError}</p>}
        {profileSuccess && <p className="text-sm text-emerald-600">Saved.</p>}
        <Button type="submit" loading={pending} size="sm">Save</Button>
      </form>

      <form ref={incomeFormRef} onSubmit={handleIncome} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Income & pay cycle</h2>
        <p className="text-sm text-gray-500">Your net/take-home pay per cycle.</p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Income amount"
            name="income_amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={payProfile?.income_amount}
            placeholder="0.00"
            required
          />
          <Select
            label="Currency"
            name="currency"
            options={currencyOptions}
            defaultValue={payProfile?.currency ?? profile?.base_currency ?? 'USD'}
          />
        </div>
        <Select
          label="Pay frequency"
          name="frequency"
          options={frequencyOptions}
          defaultValue={payProfile?.frequency ?? 'monthly'}
        />
        <Input
          label="Payday"
          name="effective_date"
          type="date"
          defaultValue={payProfile?.effective_date ?? new Date().toISOString().split('T')[0]}
          hint="A recent or upcoming pay date — used to schedule automatic goal deposits"
          required
        />
        {incomeError && <p className="text-sm text-red-600">{incomeError}</p>}
        {incomeSuccess && <p className="text-sm text-emerald-600">Saved.</p>}
        <Button type="submit" loading={pending} size="sm">Save income</Button>
      </form>
    </div>
  )
}
