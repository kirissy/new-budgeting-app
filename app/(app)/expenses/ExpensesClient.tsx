'use client'

import { useMemo, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ExpenseForm } from '@/components/forms/ExpenseForm'
import { StatementImportForm } from '@/components/forms/StatementImportForm'
import { ViewPeriodSelector } from '@/components/dashboard/ViewPeriodSelector'
import { ExpenseBudgetComparison } from '@/components/dashboard/ExpenseBudgetComparison'
import { createExpense, updateExpense, deleteExpense } from '@/app/actions/expenses'
import { formatCurrency, convertCurrency } from '@/lib/currencies'
import { formatDate } from '@/lib/dates'
import { CATEGORY_LABELS } from '@/lib/categories'
import { defaultViewSelection, resolveViewRange, projectToRange, isWithinRange } from '@/lib/viewPeriod'
import type { ViewSelection } from '@/lib/viewPeriod'
import type { BudgetedExpense, Expense, ExpenseCategory, Frequency } from '@/lib/types'

interface Props {
  expenses: Expense[]
  defaultCurrency: string
  payFrequency: Frequency
  payAnchor: string | null
  budgetedExpenses: Pick<BudgetedExpense, 'amount' | 'currency' | 'frequency' | 'active'>[]
  rates: Record<string, number>
}

type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'name_asc'

const categoryFilterOptions = [
  { value: 'all', label: 'All categories' },
  ...Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l })),
]

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'date_desc', label: 'Date (newest)' },
  { value: 'date_asc', label: 'Date (oldest)' },
  { value: 'amount_desc', label: 'Amount (high to low)' },
  { value: 'amount_asc', label: 'Amount (low to high)' },
  { value: 'name_asc', label: 'Name (A–Z)' },
]

function compareExpenses(a: Expense, b: Expense, sortKey: SortKey): number {
  switch (sortKey) {
    case 'date_desc': return b.spent_on.localeCompare(a.spent_on)
    case 'date_asc': return a.spent_on.localeCompare(b.spent_on)
    case 'amount_desc': return b.amount - a.amount
    case 'amount_asc': return a.amount - b.amount
    case 'name_asc': return a.name.localeCompare(b.name)
  }
}

export function ExpensesClient({ expenses, defaultCurrency, payFrequency, payAnchor, budgetedExpenses, rates }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date_desc')
  const [view, setView] = useState<ViewSelection>(defaultViewSelection(!!payAnchor))
  const [, startTransition] = useTransition()

  const range = useMemo(
    () => resolveViewRange(view, payAnchor ? new Date(payAnchor) : null, payFrequency, new Date()),
    [view, payAnchor, payFrequency]
  )

  const expensesInRange = useMemo(
    () => expenses.filter((e) => isWithinRange(e.spent_on, range)),
    [expenses, range]
  )

  const filteredExpenses = useMemo(() => {
    const list = categoryFilter === 'all' ? expensesInRange : expensesInRange.filter((e) => e.category === categoryFilter)
    return [...list].sort((a, b) => compareExpenses(a, b, sortKey))
  }, [expensesInRange, categoryFilter, sortKey])

  const actualTotal = expensesInRange.reduce(
    (sum, e) => sum + convertCurrency(e.amount, e.currency, defaultCurrency, rates),
    0
  )
  const budgetedTotal = budgetedExpenses
    .filter((e) => e.active)
    .reduce((sum, e) => sum + convertCurrency(projectToRange(e.amount, e.frequency, range), e.currency, defaultCurrency, rates), 0)

  function openAdd() { setEditing(null); setModalOpen(true) }
  function openEdit(item: Expense) { setEditing(item); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteExpense(id) })
  }

  return (
    <>
      <div className="mb-6">
        <ExpenseBudgetComparison
          actualTotal={actualTotal}
          budgetedTotal={budgetedTotal}
          currency={defaultCurrency}
          cycleStart={range.start}
          cycleEnd={range.end}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex flex-wrap items-start gap-2">
            <div className="w-44">
              <Select
                name="category_filter"
                options={categoryFilterOptions}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
              />
            </div>
            <div className="w-40">
              <Select
                name="sort"
                options={sortOptions}
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              />
            </div>
            <ViewPeriodSelector value={view} onChange={setView} hasPayCycle={!!payAnchor} range={range} />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setImportModalOpen(true)} size="sm" variant="secondary">Import statement</Button>
            <Button onClick={openAdd} size="sm">+ Add expense</Button>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-500 text-sm">
            {expenses.length === 0 ? 'No expenses logged yet. Add your first one.' : 'No expenses match these filters.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filteredExpenses.map((expense) => (
              <li key={expense.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{expense.name}</p>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        {CATEGORY_LABELS[expense.category]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(expense.spent_on)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(expense.amount, expense.currency)}
                    </p>
                    <button onClick={() => openEdit(expense)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Edit</button>
                    <button onClick={() => handleDelete(expense.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit expense' : 'Add expense'}>
        <ExpenseForm
          defaultCurrency={defaultCurrency}
          item={editing ?? undefined}
          onSubmit={editing ? (fd) => updateExpense(editing.id, fd) : createExpense}
          onDone={closeModal}
        />
      </Modal>

      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="Import bank statement" size="xl">
        <StatementImportForm
          defaultCurrency={defaultCurrency}
          onDone={() => setImportModalOpen(false)}
        />
      </Modal>
    </>
  )
}
