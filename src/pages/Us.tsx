import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

export default function Us() {
  const { session } = useAuth()

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Us</h1>
      <p className="text-gray-400">Placeholder for the Us page.</p>
      {session && (
        <>
          <p className="mt-4 text-white">Signed in as <span className="text-gray-400">{session.user.email}</span></p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded"
          >Sign out</button>
        </>
      )}
    </div>
  )
}
