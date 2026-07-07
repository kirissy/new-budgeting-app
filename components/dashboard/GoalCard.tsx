import type { GoalContribution } from '@/lib/types'
import { formatCurrency } from '@/lib/currencies'
import { FREQUENCY_LABELS } from '@/lib/calculations'
import type { Frequency } from '@/lib/types'
import { format } from 'date-fns'

interface Props {
  gc: GoalContribution
  payFreq: Frequency
}

const STATUS_STYLES = {
  achieved: 'bg-green-50 text-green-700 border-green-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  'no-date': 'bg-gray-50 text-gray-500 border-gray-200',
  'on-track': 'bg-violet-50 text-violet-700 border-violet-200',
}

const STATUS_LABELS = {
  achieved: 'Achieved!',
  overdue: 'Overdue',
  'no-date': 'No date set',
  'on-track': 'On track',
}

export function GoalCard({ gc, payFreq }: Props) {
  const { goal, contribution, status, remainingCycles, remainingAmount } = gc
  const progress = Math.min(100, (goal.current_saved / goal.target_amount) * 100)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{goal.name}</h3>
          {goal.target_date && (
            <p className="text-xs text-gray-500 mt-0.5">
              Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}
            </p>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{formatCurrency(goal.current_saved, goal.currency)} saved</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>of {formatCurrency(goal.target_amount, goal.currency)}</span>
          {remainingAmount > 0 && (
            <span>{formatCurrency(remainingAmount, goal.currency)} left</span>
          )}
        </div>
      </div>

      {status === 'on-track' && (
        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-medium text-gray-900">{formatCurrency(contribution, goal.currency)}</span>
          <span className="text-gray-500"> / {FREQUENCY_LABELS[payFreq].toLowerCase()} · {remainingCycles} cycles left</span>
        </div>
      )}
      {status === 'overdue' && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          Full remaining amount due: <span className="font-medium">{formatCurrency(remainingAmount, goal.currency)}</span>
        </div>
      )}
      {status === 'no-date' && (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          Set a target date to calculate per-cycle contribution
        </div>
      )}
    </div>
  )
}
