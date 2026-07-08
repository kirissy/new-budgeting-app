'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { BudgetedExpenseForm } from '@/components/forms/BudgetedExpenseForm'
import { createBudgetedExpense, updateBudgetedExpense, deleteBudgetedExpense, toggleBudgetedExpenseActive } from '@/app/actions/budgetedExpenses'
import { formatCurrency } from '@/lib/currencies'
import { normalizeToCycle, FREQUENCY_LABELS } from '@/lib/calculations'
import { CATEGORY_LABELS } from '@/lib/categories'
import type { BudgetedExpense, Frequency } from '@/lib/types'

interface Props {
  budgetedExpenses: BudgetedExpense[]
  defaultCurrency: string
  payFrequency: Frequency
}

export function BudgetedExpensesClient({ budgetedExpenses, defaultCurrency, payFrequency }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetedExpense | null>(null)
  const [, startTransition] = useTransition()

  const activeExpenses = budgetedExpenses.filter((e) => e.active)
  const totalPerCycle = activeExpenses.reduce(
    (s, e) => s + normalizeToCycle(e.amount, e.frequency, payFrequency),
    0
  )

  function openAdd() { setEditing(null); setModalOpen(true) }
  function openEdit(item: BudgetedExpense) { setEditing(item); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => { await toggleBudgetedExpenseActive(id, active) })
  }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteBudgetedExpense(id) })
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <span className="font-medium text-gray-900">
              Per-cycle total
            </span>
            <span className="ml-2 text-lg font-bold text-violet-700">
              {formatCurrency(totalPerCycle, defaultCurrency)}
            </span>
          </div>
          <Button onClick={openAdd} size="sm">+ Add budgeted expense</Button>
        </div>

        {budgetedExpenses.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-500 text-sm">
            No budgeted expenses yet. Add your first recurring cost or subscription.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {budgetedExpenses.map((expense) => {
              const perCycle = normalizeToCycle(expense.amount, expense.frequency, payFrequency)
              return (
                <li key={expense.id} className={`px-5 py-3.5 ${!expense.active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={expense.active}
                        onChange={(e) => handleToggle(expense.id, e.target.checked)}
                        className="h-4 w-4 rounded accent-violet-600 flex-shrink-0"
                        aria-label={`Toggle ${expense.name}`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{expense.name}</p>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                            {CATEGORY_LABELS[expense.category]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(expense.amount, expense.currency)} / {FREQUENCY_LABELS[expense.frequency].toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(perCycle, expense.currency)}
                        </p>
                        <p className="text-xs text-gray-400">per cycle</p>
                      </div>
                      <button onClick={() => openEdit(expense)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Edit</button>
                      <button onClick={() => handleDelete(expense.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit budgeted expense' : 'Add budgeted expense'}>
        <BudgetedExpenseForm
          defaultCurrency={defaultCurrency}
          payFrequency={payFrequency}
          item={editing ?? undefined}
          onSubmit={editing ? (fd) => updateBudgetedExpense(editing.id, fd) : createBudgetedExpense}
          onDone={closeModal}
        />
      </Modal>
    </>
  )
}
