'use client'

import { subDays } from 'date-fns'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { formatDate } from '@/lib/dates'
import { VIEW_MODE_LABELS } from '@/lib/viewPeriod'
import type { ViewMode, ViewSelection, ResolvedRange } from '@/lib/viewPeriod'

interface Props {
  value: ViewSelection
  onChange: (next: ViewSelection) => void
  hasPayCycle: boolean
  range: ResolvedRange
}

const ALL_MODE_OPTIONS = (Object.keys(VIEW_MODE_LABELS) as ViewMode[]).map((mode) => ({
  value: mode,
  label: VIEW_MODE_LABELS[mode],
}))

const todayInputValue = () => new Date().toISOString().split('T')[0]

export function ViewPeriodSelector({ value, onChange, hasPayCycle, range }: Props) {
  const modeOptions = hasPayCycle ? ALL_MODE_OPTIONS : ALL_MODE_OPTIONS.filter((o) => o.value !== 'pay_cycle')

  function handleModeChange(mode: ViewMode) {
    if (mode === 'custom') {
      const today = todayInputValue()
      onChange({ mode, offset: 0, customStart: today, customEnd: today })
    } else {
      onChange({ mode, offset: 0 })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-40">
          <Select
            label="View"
            name="view_mode"
            options={modeOptions}
            value={value.mode}
            onChange={(e) => handleModeChange(e.target.value as ViewMode)}
          />
        </div>
        {value.mode === 'custom' && (
          <>
            <Input
              label="From"
              type="date"
              value={value.customStart ?? ''}
              max={value.customEnd ?? undefined}
              onChange={(e) => onChange({ ...value, customStart: e.target.value })}
            />
            <Input
              label="To"
              type="date"
              value={value.customEnd ?? ''}
              min={value.customStart ?? undefined}
              max={todayInputValue()}
              onChange={(e) => onChange({ ...value, customEnd: e.target.value })}
            />
          </>
        )}
      </div>

      {value.mode !== 'all' && value.mode !== 'custom' && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...value, offset: value.offset - 1 })}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Previous period"
          >
            ‹
          </button>
          <span className="text-xs font-medium text-gray-600">
            {range.start && range.end
              ? `${formatDate(range.start)} – ${formatDate(subDays(range.end, 1))}`
              : '—'}
            {value.offset === 0 && <span className="text-gray-400 font-normal"> (current)</span>}
          </span>
          <button
            type="button"
            onClick={() => onChange({ ...value, offset: value.offset + 1 })}
            disabled={value.offset >= 0}
            className="text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
            aria-label="Next period"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
