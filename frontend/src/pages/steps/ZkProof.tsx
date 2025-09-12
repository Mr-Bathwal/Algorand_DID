import { useEffect, useMemo, useState, useRef } from 'react'
// Removed Ethereum dependencies - using Algorand only
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'
import QRCode from 'qrcode'

export default function ZkProof({ onBack }: { onBack: () => void }) {
  const [treeData, setTreeData] = useState<{ key: string; value: string }[]>([])
  const [leaves, setLeaves] = useState<Buffer[]>([])
  const [tree, setTree] = useState<MerkleTree | null>(null)
  const [root, setRoot] = useState<string>('')
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Collect finalized data from previous steps (stored locally during flow)
  useEffect(() => {
    try {
      const items: { key: string; value: string }[] = []
      const faceProof = localStorage.getItem('identity_face_proof')
      if (faceProof) {
        const p = JSON.parse(faceProof)
        items.push({ key: 'faceHash', value: p.faceHash })
        items.push({ key: 'faceSignature', value: p.signature })
      }
      const faceTemplate = localStorage.getItem('identity_face_template')
      if (faceTemplate) {
        const t = JSON.parse(faceTemplate)
        items.push({ key: 'faceTemplateHash', value: t.hash })
        items.push({ key: 'faceCapturedAt', value: String(t.timestamp) })
      }
      const aadhaarQR = localStorage.getItem('aadhaar_qr_last')
      if (aadhaarQR) {
        const a = JSON.parse(aadhaarQR)
        if (a.data) {
          const d = a.data
          if (d.name) items.push({ key: 'aadhaarName', value: d.name })
          if (d.dob) items.push({ key: 'aadhaarDOB', value: d.dob })
          if (d.gender) items.push({ key: 'aadhaarGender', value: d.gender })
          if (d.aadhaarLast4) items.push({ key: 'aadhaarLast4', value: String(d.aadhaarLast4) })
          if (d.address) items.push({ key: 'aadhaarAddress', value: d.address })
        }
      }
      const itrTriplet = localStorage.getItem('itr_triplet_last')
      if (itrTriplet) {
        const i = JSON.parse(itrTriplet)
        const d = i.data || {}
        if (d.totalIncome) items.push({ key: 'totalIncome', value: String(d.totalIncome) })
        if (d.assessmentYear) items.push({ key: 'assessmentYear', value: String(d.assessmentYear) })
        if (d.filingDate) items.push({ key: 'filingDate', value: String(d.filingDate) })
        if (d.ackNumber) items.push({ key: 'ackNumber', value: String(d.ackNumber) })
        if (d.pan) items.push({ key: 'pan', value: String(d.pan) })
        if (d.trioHash) items.push({ key: 'itrTrioHash', value: String(d.trioHash) })
      }
      setTreeData(items)
    } catch (e) {
      console.error('Failed to load prior data', e)
    }
  }, [])

  // Build Merkle tree from collected key=value pairs
  useEffect(() => {
    if (treeData.length === 0) return
    const ls = treeData.map(({ key, value }) => keccak256(`${key}:${value}`))
    const t = new MerkleTree(ls, keccak256, { sortPairs: true })
    setLeaves(ls)
    setTree(t)
    setRoot('0x' + t.getRoot().toString('hex'))
  }, [treeData])

  async function generateQR() {
    if (!tree) return
    const payload = {
      schema: 'identity-merkle-v1',
      root,
      leaves: treeData.map(({ key, value }, idx) => ({ key, value, leaf: '0x' + leaves[idx].toString('hex') })),
      createdAt: Date.now()
    }
    const png = await QRCode.toDataURL(JSON.stringify(payload))
    setQrDataUrl(png)
  }
  // Algorand ZK proof functions will be implemented
  const zkFns = useMemo(() => {
    // TODO: Implement Algorand ZK proof functions
    return []
  }, [])

  return (
    <div className="space-y-6">
      <div className="glass p-4 rounded-lg border border-white/10">
        <div className="font-semibold mb-3">Zero-Knowledge Merkle Tree</div>
        <p className="text-sm text-white/70 mb-4">Your identity data (Face + Aadhaar + ITR) is represented as a Merkle tree. Root commits to all leaves.</p>

        {/* Merkle Root */}
        <div className="p-3 bg-white/5 rounded-md border border-white/10 mb-4">
          <div className="text-xs text-slate-300">Merkle Root:</div>
          <div className="font-mono text-xs break-all text-white">{root || '—'}</div>
        </div>

        {/* Tree View */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-white/80">Tree</div>
          <div className="p-3 bg-white/5 rounded-md border border-white/10">
            <div className="text-xs text-slate-300 mb-2">User ➜ Leaves</div>
            <ul className="text-xs space-y-1">
              {treeData.map(({ key, value }, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400">↳</span>
                  <span className="text-white/90"><strong>{key}</strong>: {String(value)}</span>
                </li>
              ))}
              {treeData.length === 0 && <li className="text-white/60">No data found. Complete previous steps first.</li>}
            </ul>
          </div>
        </div>

        {/* Generate QR */}
        <div className="mt-4 flex items-center gap-3">
          <button type="button" className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white" onClick={generateQR} disabled={!treeData.length}>Generate QR</button>
          {qrDataUrl && <img src={qrDataUrl} alt="Merkle QR" className="h-28 w-28 rounded-md border border-white/10" />}
        </div>
      </div>

      {/* Optional: Proof submission */}
      <div className="glass p-4 rounded-lg border border-white/10">
        <div className="font-semibold mb-3">Zero-Knowledge Proof Submission</div>
        <p className="text-sm text-white/70 mb-4">Detected write methods that accept proof bytes. Paste or upload your proof and submit.</p>
        <div className="space-y-4">
          <div className="text-white/60 text-sm">Algorand ZK proof functions will be implemented here.</div>
        </div>
        <div className="mt-4">
          <button type="button" className="px-4 py-2 rounded-md bg-white/10" onClick={onBack}>← Back</button>
        </div>
      </div>
    </div>
  )
}

