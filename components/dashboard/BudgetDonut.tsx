'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { BudgetBreakdown } from '@/lib/types'
import { formatCurrency, getCurrencySymbol } from '@/lib/currencies'
import { getPercentage } from '@/lib/calculations'

const COLORS = ['#7c3aed', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#6b7280']

const GOAL_COLORS = ['#0891b2', '#059669', '#d97706', '#dc2626', '#8b5cf6', '#ec4899']

interface Props {
  breakdown: BudgetBreakdown
}

export function BudgetDonut({ breakdown }: Props) {
  const { income, expensesTotal, billsTotal, goalContributions, investment, currency } = breakdown

  const data = [
    { name: 'Expenses', value: Math.max(0, expensesTotal), color: COLORS[0] },
    { name: 'Bills', value: Math.max(0, billsTotal), color: COLORS[1] },
    ...goalContributions
      .filter((gc) => gc.contributionInBase > 0)
      .map((gc, i) => ({
        name: gc.goal.name,
        value: gc.contributionInBase,
        color: GOAL_COLORS[i % GOAL_COLORS.length],
      })),
    { name: 'Investment', value: Math.max(0, investment), color: COLORS[5] },
  ].filter((d) => d.value > 0)

  const sym = getCurrencySymbol(currency)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">This Pay Cycle</h2>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => typeof value === 'number' ? formatCurrency(value, currency) : String(value)}
            contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontSize: '13px' }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-2 space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-gray-600">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{formatCurrency(item.value, currency)}</span>
              <span className="text-xs text-gray-400 w-10 text-right">
                {getPercentage(item.value, income)}%
              </span>
            </div>
          </div>
        ))}
        <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-sm font-semibold">
          <span className="text-gray-900">Income</span>
          <span className="text-violet-700">{formatCurrency(income, currency)}</span>
        </div>
      </div>
    </div>
  )
}
