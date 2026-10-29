import { useAuth } from '../auth/AuthProvider'
import { useProfile } from '../household/useProfile'
import { supabase } from '../lib/supabase'
import CopyCode from '../household/CopyCode'
import SwitchHousehold from '../household/SwitchHousehold'
import GoalsCard from '../household/GoalsCard'
import YouCard from '../household/YouCard'
import DataCard from '../household/DataCard'
import WeekCard from '../dashboard/WeekCard'
import { installHint, installText } from '../pwa/install'

export default function Us() {
  const { session } = useAuth()
  const { profile, household, partner } = useProfile()

  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
  const hint = installHint(navigator.userAgent, navigator.maxTouchPoints, standalone)

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Us</h1>
      {session && (
        <>
          <p className="text-white">Signed in as <span className="text-gray-400">{session.user.email}</span></p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded">Sign out</button>
          {hint !== null && (
            <p className="mt-3 text-xs text-gray-400 max-w-sm mx-auto">{installText(hint)}</p>
          )}

          {household && (
            <div className="mt-6 space-y-4">
              <p className="text-lg font-semibold">{household.name}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: profile?.color ?? '#6366f1' }} />
                  <p className="text-sm font-semibold">{profile?.display_name}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  {partner ? (
                    <>
                      <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: partner.color }} />
                      <p className="text-sm font-semibold">{partner.display_name}</p>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs">Waiting…</p>
                  )}
                </div>
              </div>
              <div className="max-w-sm mx-auto"><WeekCard /></div>
              <div className="max-w-sm mx-auto"><YouCard /></div>
              <div className="max-w-sm mx-auto">
                <GoalsCard />
              </div>
              <div className="max-w-sm mx-auto"><DataCard /></div>

              {!partner && (
                <div className="max-w-sm mx-auto space-y-2">
                  <p className="text-sm text-gray-400">Waiting for your partner to join. Share this code:</p>
                  <CopyCode code={household.invite_code} />
                  <div className="pt-4">
                    <SwitchHousehold />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
