// Configuration store for the application
export interface ConfigState {
  network: string
  contractAddresses: Record<string, string>
  isConnected: boolean
  userAddress?: string
}

export const useConfigStore = () => {
  // Mock implementation - replace with actual state management
  return {
    network: 'testnet',
    contractAddresses: {},
    isConnected: false,
    userAddress: undefined
  }
}
