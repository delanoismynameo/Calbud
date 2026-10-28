import { useState } from 'react'
import ProfileStep from './ProfileStep'
import HouseholdStep from './HouseholdStep'
import { supabase } from '../lib/supabase'

export default function Setup() {
  const [step, setStep] = useState(1)

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm">
        {step === 1 ? (
          <ProfileStep onDone={() => setStep(2)} />
        ) : (
          <HouseholdStep onBack={() => setStep(1)} />
        )}

        <div className="flex justify-end mt-4">
          <button onClick={() => supabase.auth.signOut()}
            className="text-xs text-gray-400 hover:text-white">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
