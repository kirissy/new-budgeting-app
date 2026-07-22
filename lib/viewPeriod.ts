import { addDays, addWeeks, addMonths, addYears, startOfWeek, startOfMonth, startOfYear, differenceInDays } from 'date-fns'
import { ANNUAL_MULTIPLIERS, getPayCycle } from './calculations'
import type { Frequency } from './types'

export type ViewMode = 'pay_cycle' | 'weekly' | 'monthly' | 'yearly' | 'all' | 'custom'

export interface ViewSelection {
  mode: ViewMode
  offset: number
  customStart?: string
  customEnd?: string
}

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  pay_cycle: 'Pay cycle',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  all: 'All history',
  custom: 'Custom range',
}

// Short unit word used in "$X / <unit>" style labels. "all" has no natural
// cycle length, so recurring totals under it fall back to an annual rate.
export const VIEW_MODE_UNIT: Record<ViewMode, string> = {
  pay_cycle: 'pay cycle',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
  all: 'year',
  custom: 'period',
}

export interface ResolvedRange {
  start: Date | null
  end: Date | null // exclusive
  days: number | null // null = unbounded ("all history")
}

export function defaultViewSelection(hasPayCycle: boolean): ViewSelection {
  return hasPayCycle ? { mode: 'pay_cycle', offset: 0 } : { mode: 'monthly', offset: 0 }
}

function getCalendarRange(mode: 'weekly' | 'monthly' | 'yearly', today: Date, offset: number): { start: Date; end: Date } {
  switch (mode) {
    case 'weekly': {
      const start = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), offset)
      return { start, end: addWeeks(start, 1) }
    }
    case 'monthly': {
      const start = addMonths(startOfMonth(today), offset)
      return { start, end: addMonths(start, 1) }
    }
    case 'yearly': {
      const start = addYears(startOfYear(today), offset)
      return { start, end: addYears(start, 1) }
    }
  }
}

export function resolveViewRange(
  selection: ViewSelection,
  payAnchor: Date | null,
  payFreq: Frequency,
  today: Date
): ResolvedRange {
  switch (selection.mode) {
    case 'pay_cycle': {
      if (!payAnchor) return { start: null, end: null, days: null }
      const cycle = getPayCycle(payAnchor, payFreq, today, selection.offset)
      // Date boundaries use getPayCycle's whole-day-rounded cycle length (fine
      // for filtering dated records), but reprojection needs the *exact*
      // fractional cycle length — otherwise a same-frequency amount (e.g. the
      // user's own income, defined at payFreq) picks up rounding drift instead
      // of passing straight through unchanged.
      const exactDays = 365 / ANNUAL_MULTIPLIERS[payFreq]
      return { start: cycle.start, end: cycle.end, days: exactDays }
    }
    case 'weekly':
    case 'monthly':
    case 'yearly': {
      const range = getCalendarRange(selection.mode, today, selection.offset)
      return { start: range.start, end: range.end, days: differenceInDays(range.end, range.start) }
    }
    case 'custom': {
      if (!selection.customStart || !selection.customEnd) return { start: null, end: null, days: null }
      const start = new Date(selection.customStart)
      const end = addDays(new Date(selection.customEnd), 1)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return { start: null, end: null, days: null }
      }
      return { start, end, days: differenceInDays(end, start) }
    }
    case 'all':
    default:
      return { start: null, end: null, days: null }
  }
}

// Projects a recurring amount (defined at sourceFreq cadence) onto a resolved
// range, e.g. a monthly subscription shown under a "weekly" or custom 12-day
// view. Unbounded ranges ("all history") fall back to the annual rate, since
// there's no bounded history to sum for a recurring definition.
export function projectToRange(amount: number, sourceFreq: Frequency, range: ResolvedRange): number {
  const annualAmount = amount * ANNUAL_MULTIPLIERS[sourceFreq]
  if (range.days == null) return annualAmount
  return (annualAmount * range.days) / 365
}

export function isWithinRange(dateStr: string, range: ResolvedRange): boolean {
  if (!range.start || !range.end) return true
  const d = new Date(dateStr)
  return d >= range.start && d < range.end
}
