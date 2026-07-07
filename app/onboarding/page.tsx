'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { CURRENCIES } from '@/lib/currencies'
import { FREQUENCY_LABELS } from '@/lib/calculations'
import { upsertProfile, upsertPayProfile } from '@/app/actions/profile'

const currencyOptions = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))
const frequencyOptions = Object.entries(FREQUENCY_LABELS).map(([v, l]) => ({ value: v, label: l }))

const STEPS = ['Currency', 'Income']

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    const data = new FormData(formRef.current)
    setError('')

    if (step === 0) {
      startTransition(async () => {
        const result = await upsertProfile(data)
        if (result?.error) { setError(result.error); return }
        setStep(1)
      })
    } else {
      startTransition(async () => {
        const result = await upsertPayProfile(data)
        if (result?.error) { setError(result.error); return }
        router.push('/dashboard')
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 mb-4">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Paycycle</h1>
          <p className="text-sm text-gray-500 mt-1">Set up your budget in 2 steps</p>
        </div>

        <div className="flex gap-2 mb-6">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? 'bg-violet-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form ref={formRef} onSubmit={handleNext} className="flex flex-col gap-5">
            {step === 0 && (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Base currency</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    All your totals will be displayed in this currency.
                  </p>
                </div>
                <Select
                  label="Base currency"
                  name="base_currency"
                  options={currencyOptions}
                  defaultValue="USD"
                />
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Your income</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Enter your net (take-home) pay — no tax calculation needed.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Income amount"
                    name="income_amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    required
                  />
                  <Select
                    label="Currency"
                    name="currency"
                    options={currencyOptions}
                    defaultValue="USD"
                  />
                </div>
                <Select
                  label="Pay frequency"
                  name="frequency"
                  options={frequencyOptions}
                  defaultValue="monthly"
                />
                <Input
                  label="Payday"
                  name="effective_date"
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  hint="A recent or upcoming pay date — used to schedule automatic goal deposits"
                  required
                />
              </>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              {step > 0 && (
                <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              <Button type="submit" loading={pending} size="lg" className="flex-1">
                {step === STEPS.length - 1 ? 'Go to dashboard →' : 'Continue →'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
