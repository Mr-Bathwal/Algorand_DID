import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import algosdk from 'algosdk'
import { PeraWalletConnect } from '@perawallet/connect'
import { DeflyWalletConnect } from '@blockshake/defly-connect'

type AlgoNetwork = 'mainnet' | 'testnet' | 'betanet'

interface AlgorandContextValue {
  address: string | null
  isConnected: boolean
  network: AlgoNetwork
  connectPera: () => Promise<void>
  connectDefly: () => Promise<void>
  disconnect: () => Promise<void>
  signAndSend: (txn: algosdk.TransactionLike) => Promise<string>
  algod: algosdk.Algodv2
}

const AlgorandContext = createContext<AlgorandContextValue | undefined>(undefined)

const DEFAULT_NETWORK: AlgoNetwork = (import.meta.env.VITE_ALGO_NETWORK as AlgoNetwork) || 'testnet'

function getAlgod(network: AlgoNetwork) {
  const endpoints: Record<AlgoNetwork, { url: string; token: string; port?: string | number }>
    = {
      mainnet: { url: import.meta.env.VITE_ALGOD_MAINNET_URL || 'https://mainnet-api.algonode.cloud', token: import.meta.env.VITE_ALGOD_TOKEN || '' },
      testnet: { url: import.meta.env.VITE_ALGOD_TESTNET_URL || 'https://testnet-api.algonode.cloud', token: import.meta.env.VITE_ALGOD_TOKEN || '' },
      betanet: { url: import.meta.env.VITE_ALGOD_BETANET_URL || 'https://betanet-api.algonode.cloud', token: import.meta.env.VITE_ALGOD_TOKEN || '' },
    }
  const { url, token } = endpoints[network]
  return new algosdk.Algodv2(token, url, '')
}

export function AlgorandProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [network] = useState<AlgoNetwork>(DEFAULT_NETWORK)
  const [pera] = useState(() => new PeraWalletConnect())
  const [defly] = useState(() => new (DeflyWalletConnect as any)())
  const algod = useMemo(() => getAlgod(network), [network])

  // Restore session
  useEffect(() => {
    const cached = localStorage.getItem('algo_connected_wallet')
    if (!cached) return
    if (cached === 'pera') {
      pera.reconnectSession().then((accounts: string[]) => {
        if (accounts?.length) setAddress(accounts[0])
      }).catch(()=>{})
    } else if (cached === 'defly') {
      defly.reconnectSession().then((accounts: string[]) => {
        if (accounts?.length) setAddress(accounts[0])
      }).catch(()=>{})
    }
  }, [])

  const connectPera = useCallback(async () => {
    const accounts = await pera.connect()
    setAddress(accounts[0])
    localStorage.setItem('algo_connected_wallet', 'pera')
  }, [pera])

  const connectDefly = useCallback(async () => {
    const accounts = await defly.connect()
    setAddress(accounts[0])
    localStorage.setItem('algo_connected_wallet', 'defly')
  }, [defly])

  const disconnect = useCallback(async () => {
    try { await pera.disconnect() } catch {}
    try { await defly.disconnect() } catch {}
    setAddress(null)
    localStorage.removeItem('algo_connected_wallet')
  }, [pera, defly])

  const signAndSend = useCallback(async (txn: algosdk.TransactionLike) => {
    if (!address) throw new Error('Wallet not connected')
    const params = await algod.getTransactionParams().do()
    const built = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: address,
      to: address,
      amount: 0,
      suggestedParams: params
    })
    // Use connected wallet to sign
    const provider = localStorage.getItem('algo_connected_wallet')
    let signed: Uint8Array
    if (provider === 'pera') {
      const [{ blob }] = await pera.signTransaction([[{ txn: built, signers: [address] }]])
      signed = blob
    } else if (provider === 'defly') {
      const [{ blob }] = await defly.signTransaction([[{ txn: built, signers: [address] }]])
      signed = blob
    } else {
      throw new Error('No wallet connected')
    }
    const { txId } = await algod.sendRawTransaction(signed).do()
    await algosdk.waitForConfirmation(algod, txId, 4)
    return txId
  }, [address, algod, pera, defly])

  const value: AlgorandContextValue = {
    address,
    isConnected: !!address,
    network,
    connectPera,
    connectDefly,
    disconnect,
    signAndSend,
    algod
  }

  return (
    <AlgorandContext.Provider value={value}>{children}</AlgorandContext.Provider>
  )
}

export function useAlgorand() {
  const ctx = useContext(AlgorandContext)
  if (!ctx) throw new Error('useAlgorand must be used within AlgorandProvider')
  return ctx
}


