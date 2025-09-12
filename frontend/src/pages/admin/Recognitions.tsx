import { useState } from 'react'

export default function Recognitions() {
  const [recognitions] = useState([
    {
      id: 1,
      title: 'Digital Identity Pioneer',
      description: 'First to complete full digital identity verification',
      recipient: 'John Doe',
      issuedBy: 'Government of India',
      date: '2024-01-15',
      status: 'Active'
    },
    {
      id: 2,
      title: 'Blockchain Innovator',
      description: 'Contributed to Algorand ecosystem development',
      recipient: 'Jane Smith',
      issuedBy: 'Algorand Foundation',
      date: '2024-01-20',
      status: 'Active'
    },
    {
      id: 3,
      title: 'Security Excellence',
      description: 'Outstanding contribution to cybersecurity',
      recipient: 'Bob Johnson',
      issuedBy: 'Ministry of Electronics',
      date: '2024-01-25',
      status: 'Pending'
    }
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Recognitions</h1>
        <button type="button" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
          Issue Recognition
        </button>
      </div>

      <div className="glass p-6 rounded-lg border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white font-semibold">Title</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Recipient</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Issued By</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Date</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Status</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recognitions.map((rec) => (
                <tr key={rec.id} className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">{rec.title}</td>
                  <td className="py-3 px-4 text-white/70">{rec.recipient}</td>
                  <td className="py-3 px-4 text-white/70">{rec.issuedBy}</td>
                  <td className="py-3 px-4 text-white/70">{rec.date}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      rec.status === 'Active' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {rec.status}
                    </span>
                  </td>
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