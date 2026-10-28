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
          <HouseholdStep />
        )}

        <div className="flex justify-between mt-4">
          {step === 2 && (
            <button onClick={() => setStep(1)}
              className="text-xs text-gray-400 hover:text-white">
              Back
            </button>
          )}
          <button onClick={() => supabase.auth.signOut()}
            className="text-xs text-gray-400 hover:text-white ml-auto">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
