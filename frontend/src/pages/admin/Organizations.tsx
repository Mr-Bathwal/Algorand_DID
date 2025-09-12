import { useState } from 'react'

export default function Organizations() {
  const [organizations] = useState([
    {
      id: 1,
      name: 'Government of India',
      type: 'Government',
      status: 'Active',
      verified: true,
      members: 1250
    },
    {
      id: 2,
      name: 'State Bank of India',
      type: 'Banking',
      status: 'Active',
      verified: true,
      members: 890
    },
    {
      id: 3,
      name: 'Reliance Industries',
      type: 'Corporate',
      status: 'Pending',
      verified: false,
      members: 45
    }
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Organizations</h1>
        <button type="button" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
          Add Organization
        </button>
      </div>

      <div className="glass p-6 rounded-lg border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white font-semibold">Name</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Type</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Status</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Verified</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Members</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">{org.name}</td>
                  <td className="py-3 px-4 text-white/70">{org.type}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      org.status === 'Active' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {org.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      org.verified 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {org.verified ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/70">{org.members}</td>
                  <td className="py-3 px-4">
                    <button type="button" className="text-blue-400 hover:text-blue-300 text-sm">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}