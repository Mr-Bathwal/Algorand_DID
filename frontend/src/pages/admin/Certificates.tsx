import { useState } from 'react'

export default function Certificates() {
  const [certificates] = useState([
    {
      id: 1,
      name: 'Digital Identity Certificate',
      type: 'Identity',
      issued: '2024-01-15',
      expires: '2025-01-15',
      status: 'Active',
      issuer: 'Government of India'
    },
    {
      id: 2,
      name: 'Income Verification Certificate',
      type: 'Financial',
      issued: '2024-02-20',
      expires: '2025-02-20',
      status: 'Active',
      issuer: 'Income Tax Department'
    },
    {
      id: 3,
      name: 'Educational Certificate',
      type: 'Education',
      issued: '2024-03-10',
      expires: '2025-03-10',
      status: 'Expired',
      issuer: 'University of Delhi'
    }
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Certificates</h1>
        <button type="button" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
          Issue Certificate
        </button>
      </div>

      <div className="glass p-6 rounded-lg border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white font-semibold">Name</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Type</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Issuer</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Issued</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Expires</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Status</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => (
                <tr key={cert.id} className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">{cert.name}</td>
                  <td className="py-3 px-4 text-white/70">{cert.type}</td>
                  <td className="py-3 px-4 text-white/70">{cert.issuer}</td>
                  <td className="py-3 px-4 text-white/70">{cert.issued}</td>
                  <td className="py-3 px-4 text-white/70">{cert.expires}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      cert.status === 'Active' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {cert.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button type="button" className="text-blue-400 hover:text-blue-300 text-sm">
                      View
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