import { useState } from 'react'
import ProfileStep from './ProfileStep'
import HouseholdStep from './HouseholdStep'
import { supabase } from '../lib/supabase'

export default function Setup() {
  const [step, setStep] = useState(1)

  return (
    <div className="min-h-screen bg-cream text-ink mx-auto max-w-md px-6 py-10">
      <div className="bg-card rounded-3xl shadow-card p-6 space-y-4">
        {step === 1 ? (
          <ProfileStep onDone={() => setStep(2)} />
        ) : (
          <HouseholdStep onBack={() => setStep(1)} />
        )}

        <div className="flex justify-end mt-4">
          <button onClick={() => supabase.auth.signOut()}
            className="text-xs text-link font-semibold hover:underline">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
