import React, { useState } from 'react'
import { Play, CheckCircle, AlertCircle } from 'lucide-react'

interface ContractMethodFormProps {
  method: {
    name: string
    args: string[]
    returns: string
  }
  onSubmit: (params: any[]) => void
  isLoading?: boolean
  result?: any
}

const ContractMethodForm: React.FC<ContractMethodFormProps> = ({
  method,
  onSubmit,
  isLoading = false,
  result
}) => {
  const [params, setParams] = useState<Record<string, string>>({})

  const handleParamChange = (index: number, value: string) => {
    setParams(prev => ({
      ...prev,
      [index]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const paramValues = method.args.map((_, index) => params[index] || '')
    onSubmit(paramValues)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{method.name}</h3>
        <p className="text-sm text-gray-600">Returns: {method.returns}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {method.args.map((arg, index) => (
          <div key={index}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parameter {index + 1}: {arg}
            </label>
            <input
              type="text"
              value={params[index] || ''}
              onChange={(e) => handleParamChange(index, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter ${arg}`}
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Executing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Execute Method
            </>
          )}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-4 rounded-md">
          {result.success ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-5 w-5" />
              <span>Method executed successfully!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-5 w-5" />
              <span>Error: {result.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ContractMethodForm
