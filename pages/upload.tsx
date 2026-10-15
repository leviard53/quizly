import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let timer: any
    if (jobId) {
      const poll = async () => {
        try {
          const res = await axios.get(`/api/job/${jobId}`)
          const { status, resultQuizId } = res.data
          setStatus(`Job status: ${status}`)
          if (status === 'done' && resultQuizId) {
            router.push(`/quiz/${resultQuizId}`)
          }
          if (status === 'error') {
            // show error
            setStatus(`Error: ${res.data.error}`)
          }
        } catch (err) {
          console.error(err)
        }
      }
      poll()
      timer = setInterval(poll, 3000)
    }
    return () => clearInterval(timer)
  }, [jobId])

  const handleSubmit = async (e:any) => {
    e.preventDefault()
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    form.append('numberOfQuestions', '10')
    setStatus('Uploading...')
    try {
      const res = await axios.post('/api/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      const { jobId } = res.data
      setJobId(jobId)
      setStatus('Uploaded. Job queued.')
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
