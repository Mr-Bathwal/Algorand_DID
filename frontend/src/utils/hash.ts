import { robustHash } from './hashUtils'

export async function sha256Hex(data: ArrayBuffer | Uint8Array | string): Promise<`0x${string}`> {
  let dataString: string
  if (typeof data === 'string') {
    dataString = data
  } else if (data instanceof ArrayBuffer) {
    dataString = Array.from(new Uint8Array(data)).map(b => b.toString(16).padStart(2, '0')).join('')
  } else {
    dataString = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  
  // Use CSP-compatible hash function
  const hash = robustHash(dataString)
  return (`0x${hash}`) as `0x${string}`
}

export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

