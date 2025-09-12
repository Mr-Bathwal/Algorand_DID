import { useState } from 'react'

export default function Logs() {
  const [logs] = useState([
    {
      id: 1,
      timestamp: '2024-01-15 10:30:25',
      level: 'INFO',
      message: 'User authentication successful',
      userId: 'user_123',
      action: 'LOGIN'
    },
    {
      id: 2,
      timestamp: '2024-01-15 10:32:15',
      level: 'INFO',
      message: 'Face verification completed',
      userId: 'user_123',
      action: 'FACE_VERIFICATION'
    },
    {
      id: 3,
      timestamp: '2024-01-15 10:35:42',
      level: 'WARN',
      message: 'Failed verification attempt',
      userId: 'user_456',
      action: 'VERIFICATION_FAILED'
    },
    {
      id: 4,
      timestamp: '2024-01-15 10:40:18',
      level: 'ERROR',
      message: 'Database connection timeout',
      userId: 'system',
      action: 'DB_ERROR'
    }
  ])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'INFO': return 'text-green-400'
      case 'WARN': return 'text-yellow-400'
      case 'ERROR': return 'text-red-400'
      default: return 'text-white/70'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">System Logs</h1>
        <div className="flex gap-2">
          <button type="button" className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-medium">
            Export Logs
          </button>
          <button type="button" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
            Refresh
          </button>
        </div>
      </div>

      <div className="glass p-6 rounded-lg border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white font-semibold">Timestamp</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Level</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Message</th>
                <th className="text-left py-3 px-4 text-white font-semibold">User ID</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/5">
                  <td className="py-3 px-4 text-white/70 text-sm">{log.timestamp}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-mono ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white">{log.message}</td>
                  <td className="py-3 px-4 text-white/70 font-mono text-sm">{log.userId}</td>
                  <td className="py-3 px-4 text-white/70 text-sm">{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}