import { Routes, Route, NavLink } from 'react-router'
import Today from './pages/Today'
import Prep from './pages/Prep'
import Plan from './pages/Plan'
import Us from './pages/Us'
import AddFood from './pages/AddFood'
import ResetPassword from './auth/ResetPassword'
import { isConfigured } from './lib/env'
import { useAuth } from './auth/AuthProvider'
import AuthScreen from './auth/AuthScreen'
import { useProfile } from './household/useProfile'
import Setup from './household/Setup'
import UpdatePrompt from './pwa/UpdatePrompt'
import OfflineBanner from './pwa/OfflineBanner'

const tabs = [
  { to: '/', label: 'Today' },
  { to: '/prep', label: 'Prep' },
  { to: '/plan', label: 'Plan' },
  { to: '/us', label: 'Us' },
]

export default function App() {
  const { session, loading, recovery } = useAuth()

  if (!isConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="bg-card text-ink rounded-3xl shadow-card p-6 max-w-sm text-center">Supabase isn't configured. Copy .env.example to .env.local and fill in the two values.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-ink">Loading…</p>
      </div>
    )
  }

  if (recovery) {
    return <ResetPassword />
  }

  if (!session) {
    return <AuthScreen />
  }

  return (
    <SignedInApp />
  )
}

function SignedInApp() {
  const { profile, loading, error, refresh } = useProfile()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-ink">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-danger mb-3">{error}</p>
        <button onClick={refresh} className="py-2 px-4 rounded-2xl bg-coral-deep hover:bg-coral-deeper text-white font-bold">Retry</button>
      </div>
    )
  }

  if (!profile?.household_id) {
    return <Setup />
  }

  return (
    <div className="mx-auto max-w-md min-h-screen bg-cream text-ink pb-28">
      <header className="sticky top-0 z-10 bg-cream px-6 pt-6 pb-2 text-[26px] font-extrabold tracking-tight text-ink">
        Calbud
      </header>
      <OfflineBanner />
      <main className="px-5 py-4">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/add" element={<AddFood />} />
          <Route path="/prep" element={<Prep />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/us" element={<Us />} />
        </Routes>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-md bg-card rounded-t-[32px] shadow-[0_-4px_16px_rgba(0,0,0,0.05)] flex justify-around items-center h-[72px]">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            className={({ isActive }) =>
              `relative px-4 py-2 text-xs ${isActive ? 'text-link font-bold' : 'text-muted'}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-1/2 -top-6 h-16 w-16 -translate-x-1/2 rounded-full bg-coral-light" />}
                <span className="relative">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <UpdatePrompt />
    </div>
  )
}
