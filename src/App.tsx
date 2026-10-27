import { Routes, Route, NavLink } from 'react-router'
import Today from './pages/Today'
import Prep from './pages/Prep'
import Plan from './pages/Plan'
import Us from './pages/Us'

const tabs = [
  { to: '/', label: 'Today' },
  { to: '/prep', label: 'Prep' },
  { to: '/plan', label: 'Plan' },
  { to: '/us', label: 'Us' },
]

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white pb-16">
      <header className="sticky top-0 z-10 bg-slate-800 px-4 py-3 text-center text-lg font-semibold">
        Calbud
      </header>
      <main className="px-4 py-6">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/prep" element={<Prep />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/us" element={<Us />} />
        </Routes>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex justify-around py-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            className={({ isActive }) =>
              `text-xs ${isActive ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
