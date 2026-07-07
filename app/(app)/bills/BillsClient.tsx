'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { BillForm } from '@/components/forms/BillForm'
import { createBill, updateBill, deleteBill, toggleBillActive } from '@/app/actions/bills'
import { formatCurrency } from '@/lib/currencies'
import { normalizeToCycle, FREQUENCY_LABELS } from '@/lib/calculations'
import type { Bill, Frequency } from '@/lib/types'

interface Props {
  bills: Bill[]
  defaultCurrency: string
  payFrequency: Frequency
}

export function BillsClient({ bills, defaultCurrency, payFrequency }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Bill | null>(null)
  const [, startTransition] = useTransition()

  const activeBills = bills.filter((b) => b.active)
  const totalPerCycle = activeBills.reduce(
    (s, b) => s + normalizeToCycle(b.amount, b.frequency, payFrequency),
    0
  )

  function openAdd() { setEditing(null); setModalOpen(true) }
  function openEdit(item: Bill) { setEditing(item); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => { await toggleBillActive(id, active) })
  }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteBill(id) })
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
          <Button onClick={openAdd} size="sm">+ Add bill</Button>
        </div>

        {bills.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-500 text-sm">
            No bills yet. Add your first subscription or recurring payment.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {bills.map((bill) => {
              const perCycle = normalizeToCycle(bill.amount, bill.frequency, payFrequency)
              return (
                <li key={bill.id} className={`px-5 py-3.5 ${!bill.active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={bill.active}
                        onChange={(e) => handleToggle(bill.id, e.target.checked)}
                        className="h-4 w-4 rounded accent-violet-600 flex-shrink-0"
                        aria-label={`Toggle ${bill.name}`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{bill.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(bill.amount, bill.currency)} / {FREQUENCY_LABELS[bill.frequency].toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(perCycle, bill.currency)}
                        </p>
                        <p className="text-xs text-gray-400">per cycle</p>
                      </div>
                      <button onClick={() => openEdit(bill)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Edit</button>
                      <button onClick={() => handleDelete(bill.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit bill' : 'Add bill'}>
        <BillForm
          defaultCurrency={defaultCurrency}
          payFrequency={payFrequency}
          item={editing ?? undefined}
          onSubmit={editing ? (fd) => updateBill(editing.id, fd) : createBill}
          onDone={closeModal}
        />
      </Modal>
    </>
  )
}
