import { format } from 'date-fns'

export function formatDate(date: Date | string): string {
  return format(typeof date === 'string' ? new Date(date) : date, 'dd/MM/yy')
}
