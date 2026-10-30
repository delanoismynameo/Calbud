import { useAuth } from '../auth/AuthProvider'
import { useProfile } from '../household/useProfile'
import { supabase } from '../lib/supabase'
import CopyCode from '../household/CopyCode'
import SwitchHousehold from '../household/SwitchHousehold'
import GoalsCard from '../household/GoalsCard'
import YouCard from '../household/YouCard'
import DataCard from '../household/DataCard'
import WeekCard from '../dashboard/WeekCard'
import { useCanInstall } from '../pwa/installPromptInstance'
import { installHint, installText } from '../pwa/install'
import { installPrompt } from '../pwa/installPromptInstance'
import ThemeToggle from '../ui/ThemeToggle'

export default function Us() {
  const { session } = useAuth()
  const { profile, household, partner } = useProfile()

  const canInstall = useCanInstall()

  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
  const hint = installHint(navigator.userAgent, navigator.maxTouchPoints, standalone)

  const installBtn = canInstall ? (
    <button type="button" className="mt-3 px-4 py-2 rounded-2xl bg-coral-deep hover:bg-coral-deeper text-white font-bold" onClick={() => { void installPrompt.prompt() }}>Install app</button>
  ) : null

  return (
    <div className="text-center space-y-5">
      <h1 className="text-2xl font-extrabold text-ink mb-4">Us</h1>
      {session && (
        <>
          <div className="bg-card rounded-3xl shadow-card p-5 text-center">
            <p className="text-ink mb-2">Signed in as <span className="text-muted">{session.user.email}</span></p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-6 py-2 bg-coral-light text-link rounded-2xl font-semibold hover:bg-coral-light/70">Sign out</button>
          {installBtn}
          {!canInstall && hint !== null && (
            <p className="mt-3 text-xs text-muted max-w-sm mx-auto">{installText(hint)}</p>
          )}
        </div>

        <ThemeToggle />

        {household && (
            <div className="mt-6 space-y-4">
              <p className="text-lg font-extrabold text-ink">{household.name}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card rounded-3xl shadow-card p-3 text-center">
                  <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: profile?.color ?? '#6366f1' }} />
                  <p className="text-sm font-semibold">{profile?.display_name}</p>
                </div>
                <div className="bg-card rounded-3xl shadow-card p-3 text-center">
                  {partner ? (
                    <>
                      <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: partner.color }} />
                      <p className="text-sm font-semibold">{partner.display_name}</p>
                    </>
                  ) : (
                    <p className="text-muted text-xs">Waiting…</p>
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
                  <p className="text-sm text-muted">Waiting for your partner to join. Share this code:</p>
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
