import { subDays } from 'date-fns'
import { formatCurrency } from '@/lib/currencies'
import { formatDate } from '@/lib/dates'

interface Props {
  actualTotal: number
  budgetedTotal: number
  currency: string
  cycleStart: Date | null
  cycleEnd: Date | null
  periodLabel?: string
}

export function ExpenseBudgetComparison({ actualTotal, budgetedTotal, currency, cycleStart, cycleEnd, periodLabel = 'this cycle' }: Props) {
  const isOver = budgetedTotal > 0 && actualTotal > budgetedTotal
  const progress = budgetedTotal > 0 ? Math.min(100, (actualTotal / budgetedTotal) * 100) : 0
  // cycleEnd is an exclusive upper bound — display the inclusive last day instead.
  const inclusiveEnd = cycleEnd ? subDays(cycleEnd, 1) : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Logged {periodLabel}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {cycleStart && inclusiveEnd ? `${formatDate(cycleStart)} – ${formatDate(inclusiveEnd)}` : 'All time'}
          </p>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${
            budgetedTotal === 0
              ? 'text-gray-500 bg-gray-50 border-gray-200'
              : isOver
                ? 'text-red-700 bg-red-50 border-red-200'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
          }`}
        >
          {budgetedTotal === 0 ? 'No budget set' : isOver ? 'Over budget' : 'Within budget'}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-2">
        <span className="font-semibold text-gray-900">{formatCurrency(actualTotal, currency)}</span>
        {' '}of {formatCurrency(budgetedTotal, currency)} budgeted
      </p>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
