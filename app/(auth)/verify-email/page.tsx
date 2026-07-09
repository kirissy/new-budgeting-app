'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [checked, setChecked] = useState(false)
  const [verified, setVerified] = useState(false)
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && mounted) {
        setVerified(true)
        setChecked(true)
        supabase.auth.signOut()
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session) {
        setVerified(true)
        supabase.auth.signOut()
      }
      setChecked(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleResend() {
    if (!email) return
    setResending(true)
    setResendError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    if (error) {
      setResendError(error.message)
      return
    }
    setResent(true)
  }

  if (!checked) {
    return <p className="text-center text-sm text-gray-500">Loading…</p>
  }

  if (verified) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h2 className="text-xl font-semibold text-gray-900">Email verified!</h2>
        <p className="text-sm text-gray-500">
          Your email has been confirmed. You can now sign in to your account.
        </p>
        <Button size="lg" className="w-full" onClick={() => router.push('/login')}>
          Sign in
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 text-center">
      <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
      <p className="text-sm text-gray-500">
        We&apos;ve sent a confirmation link to {email ? <strong>{email}</strong> : 'your email'}.
        Click it to verify your account before signing in.
      </p>

      {resent ? (
        <p className="text-sm text-emerald-600">Email resent — check your inbox.</p>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || !email}
          className="text-sm font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50"
        >
          {resending ? 'Resending…' : "Didn't get it? Resend email"}
        </button>
      )}
      {resendError && <p className="text-sm text-red-600">{resendError}</p>}

      <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
        Back to sign in
      </Link>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-gray-500">Loading…</p>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
