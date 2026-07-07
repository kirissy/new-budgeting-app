import { formatCurrency } from '@/lib/currencies'

interface Props {
  amount: number
  currency: string
}

export function WarningBanner({ amount, currency }: Props) {
  return (
    <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 flex items-start gap-3">
      <svg className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <p className="font-medium text-red-800">Budget exceeded by {formatCurrency(Math.abs(amount), currency)}</p>
        <p className="text-sm text-red-700 mt-0.5">
          Your expenses, bills, and goals exceed your income. Reduce contributions or expenses to stay on track.
        </p>
      </div>
    </div>
  )
}
