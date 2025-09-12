import { useState } from 'react'

export default function CrossChain() {
  const [transactions] = useState([
    {
      id: 1,
      from: 'Algorand',
      to: 'Ethereum',
      amount: '100 ALGO',
      status: 'Completed',
      timestamp: '2024-01-15 10:30:25',
      txHash: '0x1234...5678'
    },
    {
      id: 2,
      from: 'Ethereum',
      to: 'Algorand',
      amount: '50 ETH',
      status: 'Pending',
      timestamp: '2024-01-15 11:15:42',
      txHash: '0xabcd...efgh'
    },
    {
      id: 3,
      from: 'Algorand',
      to: 'Polygon',
      amount: '200 ALGO',
      status: 'Failed',
      timestamp: '2024-01-15 12:20:18',
      txHash: '0x9876...5432'
    }
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Cross-Chain Transactions</h1>
        <button type="button" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
          New Transaction
        </button>
      </div>

      <div className="glass p-6 rounded-lg border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white font-semibold">From</th>
                <th className="text-left py-3 px-4 text-white font-semibold">To</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Amount</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Status</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Timestamp</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Transaction Hash</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">{tx.from}</td>
                  <td className="py-3 px-4 text-white">{tx.to}</td>
                  <td className="py-3 px-4 text-white/70">{tx.amount}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      tx.status === 'Completed' 
                        ? 'bg-green-500/20 text-green-400' 
                        : tx.status === 'Pending'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/70 text-sm">{tx.timestamp}</td>
                  <td className="py-3 px-4 text-white/70 font-mono text-sm">{tx.txHash}</td>
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