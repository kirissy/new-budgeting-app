'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ExpenseForm } from '@/components/forms/ExpenseForm'
import { createExpense, updateExpense, deleteExpense } from '@/app/actions/expenses'
import { formatCurrency } from '@/lib/currencies'
import type { ExpenseItem } from '@/lib/types'

interface Props {
  expenses: ExpenseItem[]
  defaultCurrency: string
}

export function ExpensesClient({ expenses, defaultCurrency }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseItem | null>(null)
  const [deleting, startDelete] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  function openAdd() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(item: ExpenseItem) {
    setEditing(item)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    startDelete(async () => {
      await deleteExpense(id)
      setDeletingId(null)
    })
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <span className="font-medium text-gray-900">Total per cycle</span>
            <span className="ml-2 text-lg font-bold text-violet-700">
              {formatCurrency(total, defaultCurrency)}
            </span>
          </div>
          <Button onClick={openAdd} size="sm">
            + Add expense
          </Button>
        </div>

        {expenses.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-500">
            <p className="text-sm">No expenses yet. Add your first one.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {expenses.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-gray-700">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(item.amount, item.currency)}
                  </span>
                  {item.currency !== defaultCurrency && (
                    <span className="text-xs text-gray-400">{item.currency}</span>
                  )}
                  <button
                    onClick={() => openEdit(item)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={`Edit ${item.name}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deleting && deletingId === item.id}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    aria-label={`Delete ${item.name}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit expense' : 'Add expense'}
      >
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
