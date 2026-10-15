import { useState } from 'react'
import axios from 'axios'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')

  const handleSubmit = async (e:any) => {
    e.preventDefault()
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    setStatus('Uploading...')
    try {
      const res = await axios.post('/api/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      const { jobId } = res.data
      setStatus('File uploaded. Generating quiz...')
      // call generate endpoint
      const gen = await axios.post('/api/generate', { jobId })
      setStatus('Quiz generated — preview below')
      // show preview (left as exercise)
      console.log(gen.data)
    } catch (err:any) {
      setStatus('Error: ' + (err.message || 'upload failed'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <h2 className="text-2xl font-semibold mb-4">Upload study material</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="file" accept=".pdf,.docx,.txt,image/*" onChange={(e)=> setFile(e.target.files?.[0] ?? null)} />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Upload & Generate</button>
        </form>
        <p className="mt-4">{status}</p>
      </div>
    </div>
  )
}
