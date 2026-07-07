'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GoalForm } from '@/components/forms/GoalForm'
import { createGoal, updateGoal, deleteGoal, updateGoalSaved } from '@/app/actions/goals'
import { calculateGoalContribution, FREQUENCY_LABELS } from '@/lib/calculations'
import { formatCurrency } from '@/lib/currencies'
import type { Goal, Frequency } from '@/lib/types'

interface Props {
  goals: Goal[]
  defaultCurrency: string
  payFrequency: Frequency
  expensesTotal: number
}

const GOAL_TYPE_LABELS = { holiday: 'Holiday', emergency: 'Emergency', custom: 'Custom' }

export function GoalsClient({ goals, defaultCurrency, payFrequency, expensesTotal }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [savedModalGoal, setSavedModalGoal] = useState<Goal | null>(null)
  const [savedInput, setSavedInput] = useState('')
  const [, startTransition] = useTransition()

  function openAdd() { setEditing(null); setModalOpen(true) }
  function openEdit(item: Goal) { setEditing(item); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }

  function openSavedModal(goal: Goal) {
    setSavedModalGoal(goal)
    setSavedInput(goal.current_saved.toString())
  }
  function closeSavedModal() { setSavedModalGoal(null); setSavedInput('') }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteGoal(id) })
  }

  function handleUpdateSaved() {
    if (!savedModalGoal) return
    const val = Number(savedInput)
    if (isNaN(val) || val < 0) return
    startTransition(async () => {
      await updateGoalSaved(savedModalGoal.id, val)
      closeSavedModal()
    })
  }

  const today = new Date()

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={openAdd} size="sm">+ Add goal</Button>
        </div>

        {goals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-12 text-center text-sm text-gray-500">
            No goals yet. Add a holiday fund, emergency fund, or custom goal.
          </div>
        ) : (
          goals.map((goal) => {
            const gc = calculateGoalContribution(goal, payFrequency, today, {}, goal.currency)
            const progress = Math.min(100, (goal.current_saved / goal.target_amount) * 100)
            const statusColors = {
              achieved: 'text-green-700 bg-green-50 border-green-200',
              overdue: 'text-red-700 bg-red-50 border-red-200',
              'no-date': 'text-gray-500 bg-gray-50 border-gray-200',
              'on-track': 'text-violet-700 bg-violet-50 border-violet-200',
            }
            const statusLabels = {
              achieved: 'Achieved',
              overdue: 'Overdue',
              'no-date': 'No date',
              'on-track': 'On track',
            }

            return (
              <div key={goal.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{goal.name}</h3>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {GOAL_TYPE_LABELS[goal.type]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Target: {formatCurrency(goal.target_amount, goal.currency)}
                      {goal.target_date && ` · Due ${new Date(goal.target_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColors[gc.status]}`}>
                    {statusLabels[gc.status]}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{formatCurrency(goal.current_saved, goal.currency)} saved</span>
                    <span>{Math.round(progress)}% of {formatCurrency(goal.target_amount, goal.currency)}</span>
                  </div>
                </div>

                {gc.status === 'on-track' && (
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-3">
                    <span className="font-medium text-gray-900">{formatCurrency(gc.contribution, goal.currency)}</span>
                    {' '}/ {FREQUENCY_LABELS[payFrequency].toLowerCase()}
                    <span className="text-gray-400 ml-1">({gc.remainingCycles} cycles left)</span>
                  </div>
                )}
                {gc.status === 'overdue' && (
                  <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
                    Full remaining due: {formatCurrency(gc.remainingAmount, goal.currency)}
                  </div>
                )}
                {gc.status === 'no-date' && (
                  <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3">
                    Add a target date to calculate per-cycle contribution
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openSavedModal(goal)}
                    className="text-xs text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    Update saved
                  </button>
                  <button
                    onClick={() => openEdit(goal)}
                    className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit goal' : 'Add goal'}>
        <GoalForm
          defaultCurrency={defaultCurrency}
          expensesTotal={expensesTotal}
          item={editing ?? undefined}
          onSubmit={editing ? (fd) => updateGoal(editing.id, fd) : createGoal}
          onDone={closeModal}
        />
      </Modal>

      <Modal open={!!savedModalGoal} onClose={closeSavedModal} title="Update amount saved">
        {savedModalGoal && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Enter your current balance for <strong>{savedModalGoal.name}</strong>.
            </p>
            <Input
              label="Amount currently saved"
              type="number"
              step="0.01"
              min="0"
              value={savedInput}
              onChange={(e) => setSavedInput(e.target.value)}
              prefix={savedModalGoal.currency}
            />
            <div className="flex gap-2">
              <Button onClick={handleUpdateSaved} className="flex-1">Save</Button>
              <Button variant="secondary" onClick={closeSavedModal}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
