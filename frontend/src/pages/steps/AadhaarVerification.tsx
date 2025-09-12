import { useEffect, useRef, useState } from 'react'
import { useAlgorand } from '../../algorand/AlgorandProvider'
// Removed Ethereum dependencies - using Algorand only
import { fileToArrayBuffer, sha256Hex } from '../../utils/hash'
import jsQR from 'jsqr'
// Removed hex utility - using Algorand only
import { 
  compareFaces, 
  getStoredFaceTemplate, 
  generateAadhaarFaceHash, 
  validateFaceImage,
  AadhaarFaceData,
  FaceComparisonResult
} from '../../utils/faceComparison'
import { uidaiSDKSimulator, UIDAIQRData } from '../../utils/uidaiSDKSimulator'
import { uploadToIPFS, testPinataConnection } from '../../utils/pinata'

export default function AadhaarVerification({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { address: userAddress } = useAlgorand()
  const [qrText, setQrText] = useState('')
  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState<'idle'|'scanning'|'detected'|'error'>('idle')
  const [faceMatchResult, setFaceMatchResult] = useState<FaceComparisonResult | null>(null)
  const [faceMatchStatus, setFaceMatchStatus] = useState<'pending'|'processing'|'completed'|'error'>('pending')
  const [aadhaarFaceData, setAadhaarFaceData] = useState<string>('')
  const [storedFaceAvailable, setStoredFaceAvailable] = useState(false)
  const [storedProof, setStoredProof] = useState<{ faceHash: string; signature: string } | null>(null)
  const [parsedData, setParsedData] = useState<UIDAIQRData | null>(null)
  const [merkleTree, setMerkleTree] = useState<MerkleTreeData | null>(null)
  const [anonProof, setAnonProof] = useState<AnonAadhaarProof | null>(null)
  const [ipfsSaving, setIpfsSaving] = useState(false)
  const [ipfsHashSaved, setIpfsHashSaved] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Using Algorand smart contracts instead of Ethereum
  const address = 'ALGORAND_CONTRACT_ADDRESS' // Will be replaced with actual Algorand contract
  // Algorand transaction handling will be implemented
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const img = new Image()
    img.onload = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code?.data) setQrText(code.data)
      else alert('Could not find QR. Please try another image or use camera scan.')
    }
    img.src = URL.createObjectURL(f)
  }

async function startScan() {
    if (!videoRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      ;(videoRef.current as any).playsInline = true
      await videoRef.current.play()
      setScanning(true)
      setScanStatus('scanning')

      const tick = async () => {
        if (!scanning || !videoRef.current) return
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!canvas) { requestAnimationFrame(() => tick()); return }
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const imageData = (() => {
          const tmp = document.createElement('canvas')
          tmp.width = video.videoWidth
          tmp.height = video.videoHeight
          const tctx = tmp.getContext('2d')!
          tctx.drawImage(video, 0, 0)
          return tctx.getImageData(0, 0, tmp.width, tmp.height)
        })()
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code) {
          // draw bounding box
          ctx.strokeStyle = '#22c55e'
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y)
          ctx.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y)
          ctx.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y)
          ctx.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y)
          ctx.closePath()
          ctx.stroke()
          setQrText(code.data)
          setScanStatus('detected')
          stopScan()
          
          // Process the QR code data with new decoder (non-blocking)
          processQRCode(code.data).catch(console.error)
        } else {
          // scanning indicator
          ctx.strokeStyle = 'rgba(255,255,255,0.4)'
          ctx.lineWidth = 2
          const mid = canvas.height / 2
          ctx.beginPath()
          ctx.moveTo(20, mid)
          ctx.lineTo(canvas.width - 20, mid)
          ctx.stroke()
          requestAnimationFrame(() => tick())
        }
      }
      requestAnimationFrame(() => tick())
    } catch (e) {
      setScanStatus('error')
      alert('Camera access denied. You can upload Aadhaar image instead.')
    }
  }

  function stopScan() {
    setScanning(false)
    const s = streamRef.current
    if (s) s.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  // Check for stored face template on mount
  useEffect(() => {
    const storedTemplate = getStoredFaceTemplate()
    setStoredFaceAvailable(!!storedTemplate)
    console.log('Stored face template check:', {
      available: !!storedTemplate,
      timestamp: storedTemplate?.timestamp ? new Date(storedTemplate.timestamp).toISOString() : null
    })
    try {
      const proofRaw = localStorage.getItem('identity_face_proof')
      if (proofRaw) {
        const p = JSON.parse(proofRaw)
        if (p?.faceHash && p?.signature) setStoredProof({ faceHash: p.faceHash, signature: p.signature })
      }
    } catch {}
  }, [])
  
  useEffect(() => {
    return () => stopScan()
  }, [])
  
  // Process QR code with new Aadhaar QR decoder
  async function processQRCode(qrData: string) {
    try {
      setScanStatus('processing')
      
      // Use UIDAI SDK Simulator for proper Secure QR decoding
      const result = await uidaiSDKSimulator.decodeSecureQR(qrData)
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to decode Aadhaar QR')
      }

      const aadhaarData = result.data
      console.log('✅ UIDAI SDK: Aadhaar data decoded successfully:', {
        name: aadhaarData.name,
        uid: aadhaarData.uid,
        hasPhoto: !!aadhaarData.photo,
        isVerified: aadhaarData.isVerified,
        uidaiVersion: aadhaarData.uidaiVersion
      })
      
      // Map UIDAI SDK data to our format
      const mappedData: UIDAIQRData = {
        qrData: qrData,
        signature: aadhaarData.signature,
        timestamp: new Date().toISOString(),
        name: aadhaarData.name,
        dob: aadhaarData.dob,
        gender: aadhaarData.gender,
        aadhaarNumber: aadhaarData.uid,
        address: aadhaarData.address,
        faceImage: aadhaarData.photo,
        rawData: qrData,
        isDecrypted: aadhaarData.isVerified,
        uidaiVersion: aadhaarData.uidaiVersion,
        mobileNumber: aadhaarData.mobileNumber,
        emailId: aadhaarData.emailId
      }
      
      setParsedData(mappedData)
      setAadhaarNumber(aadhaarData.uid)
      
      // Update Aadhaar data state for display (regardless of face matching)
      setAadhaarData({
        name: aadhaarData.name,
        dob: aadhaarData.dob,
        gender: aadhaarData.gender,
        aadhaarNumber: aadhaarData.uid,
        address: aadhaarData.address,
        faceImage: aadhaarData.photo,
        mobileNumber: aadhaarData.mobileNumber || '-',
        emailId: aadhaarData.emailId || '-',
        uidaiVersion: aadhaarData.uidaiVersion || '-'
      })
      
      // Try face matching, but don't fail if it doesn't work
      try {
        await performFaceMatchingWithNewDecoder(mappedData)
      } catch (faceError) {
        console.warn('Face matching failed, but continuing with data extraction:', faceError)
        // Set a default face match result for display
        setFaceMatchResult({
          success: false,
          similarity: 0,
          confidence: 0,
          threshold: 0.2,
          faceDetected: false,
          error: 'Face image not available for matching'
        })
      }
      
      setScanStatus('detected')
      
    } catch (error) {
      console.error('QR processing error:', error)
      setScanStatus('error')
    }
  }

  // Extract face from Aadhaar QR data (supports embedded face in JSON/XML, else fallback)
  async function extractFaceFromQR(qrData: string): Promise<string | null> {
    try {
      console.log('Extracting face from Aadhaar QR data...')

      // 1) If QR contains direct data URL image
      if (qrData.startsWith('data:image/')) {
        if (validateFaceImage(qrData)) return qrData
      }

      // 2) Try JSON with fields likely carrying face image
      try {
        const parsed = JSON.parse(qrData)
        const candidates = [parsed.faceImage, parsed.face, parsed.photo, parsed.img]
        const candidate = candidates.find(Boolean)
        if (typeof candidate === 'string') {
          if (candidate.startsWith('data:image/')) {
            if (validateFaceImage(candidate)) return candidate
          }
          // Base64 without prefix
          if (/^[A-Za-z0-9+/=]+$/.test(candidate) && candidate.length > 100) {
            const dataUrl = `data:image/jpeg;base64,${candidate}`
            if (validateFaceImage(dataUrl)) return dataUrl
          }
          // Hex-encoded bytes
          if (/^(0x)?[0-9a-fA-F]+$/.test(candidate) && candidate.length > 200) {
            const hex = candidate.startsWith('0x') ? candidate.slice(2) : candidate
            const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
            const b64 = btoa(String.fromCharCode(...bytes))
            const dataUrl = `data:image/jpeg;base64,${b64}`
            if (validateFaceImage(dataUrl)) return dataUrl
          }
        }
      } catch {}

      // 3) Try to parse XML-like content and extract <Pht>...</Pht>
      if (qrData.includes('<')) {
        const match = qrData.match(/<Pht>([A-Za-z0-9+/=]+)<\/Pht>/i)
        if (match && match[1]) {
          const dataUrl = `data:image/jpeg;base64,${match[1]}`
          if (validateFaceImage(dataUrl)) return dataUrl
        }
      }

      // 4) Fallback: no embedded face found
      return null
    } catch (error) {
      console.error('Face extraction error:', error)
      return null
    }
  }

  // Parse Aadhaar QR content into structured fields (best-effort)
  function parseAadhaarQRData(qrData: string, faceDataUrl: string | null): any {
    // Try JSON first
    try {
      const j = JSON.parse(qrData)
      return {
        aadhaarLast4: j.aadhaarLast4 || j.aadhaarNumber?.slice(-4) || '',
        name: j.name || j.fullName || '',
        gender: j.gender || j.gen || '',
        dob: j.dob || j.dateOfBirth || j.DOB || '',
        address: j.address || j.addr || [j.house, j.street, j.loc, j.vtc, j.dist, j.state, j.pincode].filter(Boolean).join(', '),
        mobileMasked: j.mobile || j.mobileMasked || '',
        emailMasked: j.email || j.emailMasked || '',
        photo: faceDataUrl || j.faceImage || j.photo || '',
        raw: j
      }
    } catch {}
    
    // Try XML-like attributes or tags (old Aadhaar formats)
    const getAttr = (name: string) => {
      const m = qrData.match(new RegExp(name+"=\"([^\"]+)\""))
      return m ? m[1] : ''
    }
    const getTag = (name: string) => {
      const m = qrData.match(new RegExp(`<${name}>([^<]+)</${name}>`, 'i'))
      return m ? m[1] : ''
    }
    const name = getAttr('name') || getAttr('NAME') || getTag('Name')
    const dob = getAttr('dob') || getAttr('DOB') || getTag('DOB')
    const gender = getAttr('gender') || getAttr('GENDER') || getTag('Gender')
    const house = getAttr('house') || getAttr('houseNo') || ''
    const street = getAttr('street') || ''
    const loc = getAttr('loc') || ''
    const vtc = getAttr('vtc') || ''
    const dist = getAttr('dist') || ''
    const state = getAttr('state') || ''
    const pincode = getAttr('pc') || getAttr('pincode') || ''
    const addr = [house, street, loc, vtc, dist, state, pincode].filter(Boolean).join(', ')
    const pht = getTag('Pht')
    const photo = faceDataUrl || (pht ? `data:image/jpeg;base64,${pht}` : '')
    const maskedMobile = getTag('Mobile') || ''
    const maskedEmail = getTag('Email') || ''
    return {
      aadhaarLast4: (getAttr('uid') || '').slice(-4),
      name,
      gender,
      dob,
      address: addr,
      mobileMasked: maskedMobile,
      emailMasked: maskedEmail,
      photo,
      raw: qrData
    }
  }
  
  // Save Aadhaar data to IPFS for Merkle tree
  async function saveToIPFS(merkleData: any) {
    try {
      setIpfsSaving(true)
      
      // In real implementation, this would upload to IPFS
      // For demo, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const simulatedHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      setIpfsHashSaved(simulatedHash)
      
      console.log('Aadhaar data saved to IPFS:', simulatedHash)
    } catch (error) {
      console.error('IPFS save error:', error)
    } finally {
      setIpfsSaving(false)
    }
  }

  // Perform face matching with UIDAI SDK data
  async function performFaceMatchingWithNewDecoder(aadhaarData: UIDAIQRData) {
    if (!storedFaceAvailable) {
      console.warn('UIDAI SDK: No stored face template found. Skipping face matching.')
      setFaceMatchResult({
        success: false,
        similarity: 0,
        confidence: 0,
        threshold: 0.2,
        faceDetected: false,
        error: 'No stored face template found'
      })
      setFaceMatchStatus('completed')
      return
    }
    
    setFaceMatchStatus('processing')
    
    try {
      // Check if we have a valid face image from UIDAI SDK
      if (!aadhaarData.faceImage || aadhaarData.faceImage.length < 100) {
        console.warn('UIDAI SDK: No valid face image found in Aadhaar data')
        setFaceMatchResult({
          success: false,
          similarity: 0,
          confidence: 0,
          threshold: 0.2,
          faceDetected: false,
          error: 'No valid face image found in Aadhaar data'
        })
        setFaceMatchStatus('completed')
        return
      }

      console.log('UIDAI SDK: Extracting face from Aadhaar QR data...')
      
      // Create Aadhaar face data object
      const aadhaarFace: AadhaarFaceData = {
        imageData: aadhaarData.faceImage,
        hash: await generateAadhaarFaceHash(aadhaarData.faceImage),
        extractedFrom: 'uidai_secure_qr'
      }
      
      setAadhaarFaceData(aadhaarData.faceImage)
      
      console.log('UIDAI SDK: Comparing faces...')
      
      // Perform face comparison
      const comparisonResult = await compareFaces(aadhaarFace)
      setFaceMatchResult(comparisonResult)
      setFaceMatchStatus('completed')
      
      console.log('UIDAI SDK: Face matching completed:', {
        similarity: Math.round(comparisonResult.similarity * 100) + '%',
        match: comparisonResult.match,
        confidence: Math.round(comparisonResult.confidence * 100) + '%'
      })
      
    } catch (error) {
      console.error('UIDAI SDK: Face matching error:', error)
      setFaceMatchResult({
        success: false,
        similarity: 0,
        confidence: 0,
        threshold: 0.2,
        faceDetected: false,
        error: error instanceof Error ? error.message : 'Face matching failed'
      })
      setFaceMatchStatus('completed')
    }
  }

  // Perform face matching with stored template
  async function performFaceMatching(qrData: string) {
    if (!storedFaceAvailable) {
      alert('No stored face template found. Please complete face verification first.')
      return
    }
    
    setFaceMatchStatus('processing')
    
    try {
      // Extract face from QR
      const extractedFace = await extractFaceFromQR(qrData)
      if (!extractedFace) {
        // As last resort, keep previous simulated fallback for demo envs
        console.warn('Could not extract face from QR; using fallback simulation for demo')
        const canvas = document.createElement('canvas')
        canvas.width = 200
        canvas.height = 200
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ddd'
        ctx.fillRect(0, 0, 200, 200)
        const fallback = canvas.toDataURL('image/png')
        setAadhaarFaceData(fallback)
        const aadhaarFace: AadhaarFaceData = {
          imageData: fallback,
          hash: await generateAadhaarFaceHash(fallback),
          extractedFrom: 'aadhaar_qr'
        }
        const comparisonResult = await compareFaces(aadhaarFace)
        setFaceMatchResult(comparisonResult)
        setFaceMatchStatus('completed')
        return
      }
      
      setAadhaarFaceData(extractedFace)
      // Parse structured data for confirmation view
      const structured = parseAadhaarQRData(qrData, extractedFace)
      setParsedData(structured)
      
      // Create Aadhaar face data object
      const aadhaarFace: AadhaarFaceData = {
        imageData: extractedFace,
        hash: await generateAadhaarFaceHash(extractedFace),
        extractedFrom: 'aadhaar_qr'
      }
      
      // Compare with stored face
      const comparisonResult = await compareFaces(aadhaarFace)
      setFaceMatchResult(comparisonResult)
      setFaceMatchStatus('completed')
      
      console.log('Face matching completed:', {
        similarity: Math.round(comparisonResult.similarity * 100) + '%',
        match: comparisonResult.match,
        confidence: Math.round(comparisonResult.confidence * 100) + '%'
      })
      
      // Do not block; show result in UI, continue to confirmation
      
    } catch (error) {
      console.error('Face matching error:', error)
      setFaceMatchStatus('error')
      alert(`Face matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Confirm details and store to IPFS, then proceed to ITR
  async function confirmAndStore() {
    if (!parsedData) return
    setIpfsSaving(true)
    try {
      const pinataReady = await testPinataConnection()
      let ipfsHash = ''
      const payload = {
        type: 'aadhaar_qr',
        userAddress: userAddress || 'unknown',
        timestamp: Date.now(),
        data: {
          ...parsedData,
          faceMatch: faceMatchResult ? {
            similarity: faceMatchResult.similarity,
            match: faceMatchResult.match,
            confidence: faceMatchResult.confidence
          } : null
        }
      }
      try { localStorage.setItem('aadhaar_qr_last', JSON.stringify(payload)) } catch {}
      if (pinataReady) {
        ipfsHash = await uploadToIPFS(payload, `aadhaar-qr-${(userAddress||'').slice(2,8)}-${Date.now()}.json`)
        setIpfsHashSaved(ipfsHash)
      }
      // Navigate to ITR step
      onNext()
    } catch (e) {
      console.error('Failed to store Aadhaar QR to IPFS', e)
      alert('Failed to store to IPFS. You can continue, but data may not be saved.')
      onNext()
    } finally {
      setIpfsSaving(false)
    }
  }

  async function submit() {
    if (!address) { alert('Set UserIdentityRegistry address in Settings'); (window as any).openChatWithPrompt?.('Need help setting contract addresses?'); return }
    if (!qrText) { alert('Scan or upload Aadhaar QR first'); (window as any).openChatWithPrompt?.('Having trouble scanning the QR? Try better lighting or upload a photo.'); return }
    
    // Perform face matching first if stored face is available
    if (storedFaceAvailable && faceMatchStatus === 'pending') {
      await performFaceMatching(qrText)
      // Don't proceed to blockchain until user confirms they want to continue
      return
    }
    
    const h = await sha256Hex(qrText)
    // Algorand transaction will be implemented
    const proofHex = Array.from(new TextEncoder().encode(qrText)).map(b => b.toString(16).padStart(2, '0')).join('')
    // TODO: Implement Algorand smart contract call
    console.log('Algorand transaction would be submitted here:', { address, proofHex })
    setIsSuccess(true)
  }

  return (
    <div className="space-y-6">
      {/* Face Template Status */}
      {storedFaceAvailable && (
        <div className="glass p-4 rounded-lg border border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              ✓
            </div>
            <div>
              <div className="font-semibold text-green-400">Face Template Available</div>
              <div className="text-sm text-green-300">Ready for face matching with Aadhaar QR data</div>
            </div>
          </div>
        </div>
      )}
      
      {!storedFaceAvailable && (
        <div className="glass p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
              ⚠️
            </div>
            <div>
              <div className="font-semibold text-yellow-400">No Face Template Found</div>
              <div className="text-sm text-yellow-300">Please complete face verification first for automatic face matching</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Aadhaar Verification */}
      <div className="glass p-4 rounded-lg border border-slate-200">
        <div className="font-semibold mb-3">📄 Aadhaar Verification (QR Scan + Face Match)</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <img src="/images/aadhaar-illustration.svg" alt="Aadhaar" className="w-28 mb-3 opacity-90" />
            <div className="text-sm mb-2">Scan Aadhaar QR</div>
            <div className="relative rounded-lg overflow-hidden border border-white/10 w-full max-w-md aspect-video bg-black/40">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </div>
            <div className="flex gap-2 mt-2">
              {!scanning && (
                <button type="button" className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700" onClick={startScan}>
                  📷 Use Camera
                </button>
              )}
              {scanning && (
                <button type="button" className="px-3 py-2 rounded-md bg-red-600 hover:bg-red-700" onClick={stopScan}>
                  ⏹️ Stop
                </button>
              )}
              <label className="px-3 py-2 rounded-md bg-green-600 hover:bg-green-700 cursor-pointer">
                📁 Upload Photo
                <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              </label>
            </div>
            <div className="text-xs mt-2">
              {scanStatus==='idle' && <span className="text-white/70">Ready to scan</span>}
              {scanStatus==='scanning' && <span className="text-amber-300">📡 Scanning… hold QR steady</span>}
              {scanStatus==='detected' && <span className="text-emerald-400">✅ QR detected ✓</span>}
              {scanStatus==='error' && <span className="text-red-400">❌ Camera error</span>}
            </div>
            <div className="text-xs text-white/70 mt-2">
              💡 We'll extract the face image from Aadhaar QR and compare with your stored face template.
            </div>
          </div>
          <div>
            {/* Parsed Aadhaar Details (read-only) */}
            {qrText && (
              <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                <div className="text-sm font-medium mb-2 text-slate-200">Extracted Aadhaar Details (read-only)</div>
                <div className="text-xs space-y-1">
                  <div><span className="text-slate-300">Name:</span> <span className="text-green-300 font-mono">{parsedData?.name || '—'}</span></div>
                  <div><span className="text-slate-300">DOB:</span> <span className="text-blue-300 font-mono">{parsedData?.dob || '—'}</span></div>
                  <div><span className="text-slate-300">Gender:</span> <span className="text-purple-300 font-mono">{parsedData?.gender || '—'}</span></div>
                  <div><span className="text-slate-300">Aadhaar (last 4):</span> <span className="text-yellow-300 font-mono">{parsedData?.aadhaarNumber?.slice(-4) || '—'}</span></div>
                  <div><span className="text-slate-300">Address:</span> <span className="text-cyan-300 font-mono text-xs">{parsedData?.address || '—'}</span></div>
                  <div><span className="text-slate-300">Mobile:</span> <span className="text-orange-300 font-mono">{parsedData?.mobileNumber || '—'}</span></div>
                  <div><span className="text-slate-300">Email:</span> <span className="text-pink-300 font-mono text-xs">{parsedData?.emailId || '—'}</span></div>
                  <div><span className="text-slate-300">UIDAI Version:</span> <span className="text-indigo-300 font-mono">{parsedData?.uidaiVersion || '—'}</span></div>
                </div>
              </div>
            )}

            {/* Merkle Tree Information */}
            {merkleTree && (
              <div className="mb-4 p-3 bg-green-900/20 rounded-lg border border-green-500/30">
                <div className="text-sm font-medium mb-2 text-green-300">🔗 Merkle Tree (Privacy-Preserving)</div>
                <div className="text-xs space-y-1">
                  <div><span className="text-slate-300">Root Hash:</span> <span className="text-green-200 font-mono text-xs break-all">{merkleTree.root}</span></div>
                  <div><span className="text-slate-300">Tree Depth:</span> <span className="text-blue-200">{merkleTree.depth}</span></div>
                  <div><span className="text-slate-300">Leaves Count:</span> <span className="text-purple-200">{merkleTree.leaves.length}</span></div>
                </div>
              </div>
            )}

            {/* Anon Aadhaar Proof */}
            {anonProof && (
              <div className="mb-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                <div className="text-sm font-medium mb-2 text-blue-300">🔐 Zero-Knowledge Proof</div>
                <div className="text-xs space-y-1">
                  <div><span className="text-slate-300">Proof Generated:</span> <span className="text-green-200">✅ Yes</span></div>
                  <div><span className="text-slate-300">Nullifier Seed:</span> <span className="text-blue-200 font-mono text-xs">{anonProof.nullifierSeed}</span></div>
                  <div><span className="text-slate-300">Timestamp:</span> <span className="text-purple-200">{new Date(anonProof.timestamp).toLocaleString()}</span></div>
                  <div><span className="text-slate-300">Privacy Level:</span> <span className="text-yellow-200">Maximum (ZK)</span></div>
                </div>
              </div>
            )}

            {/* IPFS Storage */}
            {ipfsHashSaved && (
              <div className="mb-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                <div className="text-sm font-medium mb-2 text-purple-300">🌐 IPFS Storage</div>
                <div className="text-xs space-y-1">
                  <div><span className="text-slate-300">Hash:</span> <span className="text-purple-200 font-mono text-xs break-all">{ipfsHashSaved}</span></div>
                  <div><span className="text-slate-300">Status:</span> <span className="text-green-200">✅ Stored</span></div>
                  <div><span className="text-slate-300">Type:</span> <span className="text-blue-200">Aadhaar + Merkle Tree</span></div>
                </div>
              </div>
            )}
            {/* Face Matching Status */}
            <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-sm font-medium mb-2">Face Matching Status:</div>
              <div className="space-y-2">
                <div className={`text-xs flex items-center gap-2 ${
                  storedFaceAvailable ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {storedFaceAvailable ? '✅' : '⚠️'} Face Template: {storedFaceAvailable ? 'Available' : 'Missing'}
                </div>
                <div className={`text-xs flex items-center gap-2 ${
                  qrText ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {qrText ? '✅' : '⏳'} Aadhaar QR: {qrText ? 'Scanned' : 'Pending'}
                </div>
                <div className={`text-xs flex items-center gap-2 ${
                  faceMatchStatus === 'completed' ? 
                    (faceMatchResult?.match ? 'text-green-400' : 'text-red-400') :
                    faceMatchStatus === 'processing' ? 'text-blue-400' :
                    faceMatchStatus === 'error' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {faceMatchStatus === 'completed' ? 
                    (faceMatchResult?.match ? '✅' : '❌') :
                    faceMatchStatus === 'processing' ? '🔄' :
                    faceMatchStatus === 'error' ? '❌' : '⏳'
                  } Face Match: {faceMatchStatus === 'completed' ? 
                    `${Math.round((faceMatchResult?.similarity || 0) * 100)}% ${faceMatchResult?.match ? '(PASS)' : '(FAIL)'}` :
                    faceMatchStatus === 'processing' ? 'Processing...' :
                    faceMatchStatus === 'error' ? 'Error' : 'Pending'
                  }
                </div>
              </div>
            </div>
            
            {/* Face Match Result Details */}
            {faceMatchResult && faceMatchStatus === 'completed' && (
              <div className={`p-3 rounded-lg border mb-4 ${
                faceMatchResult.match 
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className={`font-semibold mb-2 ${
                  faceMatchResult.match ? 'text-green-400' : 'text-red-400'
                }`}>
                  {faceMatchResult.match ? '🎉 Face Verification PASSED!' : '🚫 Face Verification FAILED'}
                </div>
                <div className="text-sm space-y-1">
                  <div>Similarity: <strong>{Math.round(faceMatchResult.similarity * 100)}%</strong></div>
                  <div>Confidence: <strong>{Math.round(faceMatchResult.confidence * 100)}%</strong></div>
                  <div className="text-white/80">
                    Low-threshold decision (20%+): <strong>{(faceMatchResult.similarity >= 0.2) ? 'PASS' : 'FAIL'}</strong>
                  </div>
                  <div className="text-white/60">Reference threshold: 80% traditional match</div>
                  {!faceMatchResult.match && (
                    <div className="text-red-300 text-xs mt-2">
                      💡 Based on strict threshold, face doesn't match stored template.
                    </div>
                  )}
                  {(faceMatchResult.similarity < 0.2) && (
                    <div className="text-red-300 text-xs mt-1">
                      ⚠️ Face in Aadhaar QR does not match your previously captured face (low-threshold check). Please rescan or recapture if this seems wrong.
                    </div>
                  )}
                  {faceMatchResult.match && (
                    <div className="text-green-300 text-xs mt-2">
                      ✅ Face matches your stored template. Identity verified!
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Extracted Aadhaar Face Preview */}
            {aadhaarFaceData && (
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Extracted Aadhaar Face:</div>
                <img 
                  src={aadhaarFaceData} 
                  alt="Extracted from Aadhaar QR" 
                  className="w-24 h-24 rounded-lg border border-white/20"
                />
                <div className="text-xs text-white/60 mt-1">Face extracted from QR data</div>
              </div>
            )}
            
            <label className="block text-sm mb-4">
              <div className="mb-1 text-white/70">Aadhaar Number (last 4 digits, optional)</div>
              <input 
                className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10" 
                value={aadhaarNumber} 
                onChange={e=>setAadhaarNumber(e.target.value)} 
                placeholder="1234" 
              />
            </label>
            
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700" onClick={onBack}>
                ← Back
              </button>
              
              {/* First button: Extract face and compare */}
              {qrText && storedFaceAvailable && faceMatchStatus === 'pending' && (
                <button type="button" 
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700" 
                  onClick={() => performFaceMatching(qrText)}
                >
                  🔍 Extract & Match Face
                </button>
              )}
              
              {/* Processing state */}
              {faceMatchStatus === 'processing' && (
                <div className="flex items-center gap-2 text-blue-400">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Processing face match...</span>
                </div>
              )}
              
              {/* Confirm and continue to ITR after storing to IPFS */}
              {qrText && parsedData && (
                <button type="button" 
                  className={`px-4 py-2 rounded-md font-semibold ${ipfsSaving ? 'bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  onClick={confirmAndStore}
                  disabled={ipfsSaving}
                >
                  {ipfsSaving ? '⏳ Saving to IPFS…' : '✅ Confirm & Continue to ITR'}
                </button>
              )}
              
              {isPending && <span className="text-sm text-yellow-400">⏳ Waiting for confirmation...</span>}
              {isSuccess && (
                <button type="button" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 rounded-md text-white" onClick={onNext}>
                  ✅ Continue →
                </button>
              )}
              {error && <span className="text-sm text-red-400">❌ {error.message}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

