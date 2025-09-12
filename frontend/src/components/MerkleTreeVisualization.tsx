import React, { useState, useEffect } from 'react'
import { TreePine, Leaf, Hash, Database } from 'lucide-react'

interface MerkleNode {
  id: string
  hash: string
  data?: string
  isLeaf: boolean
  level: number
  position: number
  children?: MerkleNode[]
}

interface MerkleTreeVisualizationProps {
  data: string[]
  onHashGenerated: (hashes: string[]) => void
}

const MerkleTreeVisualization: React.FC<MerkleTreeVisualizationProps> = ({ 
  data, 
  onHashGenerated 
}) => {
  const [merkleTree, setMerkleTree] = useState<MerkleNode[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate hash for data
  const generateHash = (input: string): string => {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }

  // Generate Merkle tree
  const generateMerkleTree = (data: string[]): MerkleNode[] => {
    if (data.length === 0) return []

    const nodes: MerkleNode[] = []
    let currentLevel = data.map((item, index) => ({
      id: `leaf-${index}`,
      hash: generateHash(item),
      data: item,
      isLeaf: true,
      level: 0,
      position: index
    }))

    nodes.push(...currentLevel)
    let level = 1

    while (currentLevel.length > 1) {
      const nextLevel: MerkleNode[] = []
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]
        const right = currentLevel[i + 1] || left // Duplicate if odd number
        
        const combinedHash = left.hash + right.hash
        const parentHash = generateHash(combinedHash)
        
        const parent: MerkleNode = {
          id: `node-${level}-${Math.floor(i / 2)}`,
          hash: parentHash,
          isLeaf: false,
          level,
          position: Math.floor(i / 2),
          children: [left, right]
        }
        
        nextLevel.push(parent)
        nodes.push(parent)
      }
      
      currentLevel = nextLevel
      level++
    }

    return nodes
  }

  useEffect(() => {
    if (data.length > 0) {
      setIsGenerating(true)
      
      // Simulate hash generation delay
      setTimeout(() => {
        const tree = generateMerkleTree(data)
        setMerkleTree(tree)
        
        // Extract all hashes for callback
        const allHashes = tree.map(node => node.hash)
        onHashGenerated(allHashes)
        
        setIsGenerating(false)
      }, 1000)
    }
  }, [data, onHashGenerated])

  const getNodePosition = (node: MerkleNode, totalNodes: number) => {
    const levelNodes = merkleTree.filter(n => n.level === node.level)
    const levelIndex = levelNodes.findIndex(n => n.id === node.id)
    const levelWidth = levelNodes.length
    const spacing = 100 / (levelWidth + 1)
    return spacing * (levelIndex + 1)
  }

  const getNodeColor = (node: MerkleNode) => {
    if (node.isLeaf) {
      return 'bg-green-100 border-green-300 text-green-800'
    }
    return 'bg-green-200 border-green-400 text-green-900'
  }

  if (data.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center text-gray-500">
          <TreePine className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No data available for Merkle tree generation</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
          <TreePine className="h-6 w-6 text-green-600" />
          Merkle Tree Visualization
        </h2>
        <p className="text-gray-600">Data integrity verification tree</p>
      </div>

      {isGenerating ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating Merkle tree...</p>
        </div>
      ) : (
        <div className="relative min-h-96">
          {/* Merkle Tree Visualization */}
          <div className="space-y-8">
            {Array.from({ length: Math.max(...merkleTree.map(n => n.level)) + 1 }, (_, level) => {
              const levelNodes = merkleTree.filter(n => n.level === level)
              return (
                <div key={level} className="flex justify-center items-center space-x-4">
                  {levelNodes.map((node, index) => (
                    <div key={node.id} className="relative">
                      {/* Node */}
                      <div className={`
                        px-4 py-2 rounded-lg border-2 text-sm font-mono
                        ${getNodeColor(node)}
                        min-w-24 text-center
                      `}>
                        <div className="flex items-center gap-1 mb-1">
                          {node.isLeaf ? (
                            <Leaf className="h-4 w-4" />
                          ) : (
                            <Hash className="h-4 w-4" />
                          )}
                          <span className="text-xs">
                            {node.isLeaf ? 'Leaf' : 'Node'}
                          </span>
                        </div>
                        <div className="text-xs break-all">
                          {node.hash.substring(0, 8)}...
                        </div>
                        {node.data && (
                          <div className="text-xs mt-1 text-gray-600 truncate max-w-20">
                            {node.data.substring(0, 10)}...
                          </div>
                        )}
                      </div>

                      {/* Connection lines */}
                      {!node.isLeaf && node.children && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                          <div className="w-px h-4 bg-gray-300"></div>
                          <div className="flex justify-center space-x-8 mt-1">
                            <div className="w-px h-4 bg-gray-300"></div>
                            <div className="w-px h-4 bg-gray-300"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Data Summary */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Total Data Items:</span>
                <p className="text-gray-900">{data.length}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Tree Levels:</span>
                <p className="text-gray-900">{Math.max(...merkleTree.map(n => n.level)) + 1}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Root Hash:</span>
                <p className="text-gray-900 font-mono text-xs">
                  {merkleTree.find(n => n.level === Math.max(...merkleTree.map(n => n.level)))?.hash || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Leaf Data Details */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Leaf Data</h3>
            <div className="space-y-2">
              {merkleTree
                .filter(n => n.isLeaf)
                .map((node, index) => (
                  <div key={node.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Leaf className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-gray-700">Item {index + 1}:</span>
                      <span className="text-gray-900">{node.data}</span>
                    </div>
                    <div className="text-xs font-mono text-gray-600">
                      Hash: {node.hash}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MerkleTreeVisualization
