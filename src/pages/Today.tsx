import { Link } from 'react-router'

export default function Today() {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Today</h1>
      <Link to="/add" className="block w-full py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold text-lg">Add food</Link>
    </div>
  )
}
