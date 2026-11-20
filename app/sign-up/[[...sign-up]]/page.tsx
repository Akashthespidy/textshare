import { Suspense } from 'react'
import { SignUp } from '@clerk/nextjs'

function SignUpForm() {
  return <SignUp />
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-indigo-700">TextShare</h1>
          <p className="text-gray-500 mt-2">Join and start sharing texts 🌐</p>
        </div>
        <Suspense fallback={
          <div className="w-80 h-40 bg-white rounded-2xl animate-pulse flex items-center justify-center">
            <span className="text-gray-400 text-sm">Loading…</span>
          </div>
        }>
          <SignUpForm />
        </Suspense>
      </div>
    </div>
  )
}
