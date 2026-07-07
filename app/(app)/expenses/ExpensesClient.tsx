'use client'

import { useMemo, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { ExpenseForm } from '@/components/forms/ExpenseForm'
import { createExpense, updateExpense, deleteExpense } from '@/app/actions/expenses'
import { formatCurrency } from '@/lib/currencies'
import { CATEGORY_LABELS } from '@/lib/categories'
import type { Expense, ExpenseCategory } from '@/lib/types'

interface Props {
  expenses: Expense[]
  defaultCurrency: string
}

const categoryFilterOptions = [
  { value: 'all', label: 'All categories' },
  ...Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l })),
]

export function ExpensesClient({ expenses, defaultCurrency }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all')
  const [, startTransition] = useTransition()

  const filteredExpenses = useMemo(
    () => categoryFilter === 'all' ? expenses : expenses.filter((e) => e.category === categoryFilter),
    [expenses, categoryFilter]
  )

  function openAdd() { setEditing(null); setModalOpen(true) }
  function openEdit(item: Expense) { setEditing(item); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteExpense(id) })
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-48">
            <Select
              name="category_filter"
              options={categoryFilterOptions}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
            />
          </div>
          <Button onClick={openAdd} size="sm">+ Add expense</Button>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-500 text-sm">
            {expenses.length === 0 ? 'No expenses logged yet. Add your first one.' : 'No expenses in this category.'}
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
                      {new Date(expense.spent_on).toLocaleDateString()}
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
    </>
  )
}
