import React, { useState } from 'react'
import { Eye, CheckCircle, AlertCircle } from 'lucide-react'

interface ReadMethodFormProps {
  method: {
    name: string
    args: string[]
    returns: string
  }
  onRead: (params: any[]) => void
  isLoading?: boolean
  result?: any
}

const ReadMethodForm: React.FC<ReadMethodFormProps> = ({
  method,
  onRead,
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
    onRead(paramValues)
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
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Reading...
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Read Data
            </>
          )}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-4 rounded-md">
          {result.success ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span>Data read successfully!</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
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

export default ReadMethodForm
