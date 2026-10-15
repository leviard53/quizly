import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'

export default function Dashboard() {
  const [quizzes, setQuizzes] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/quizzes')
        setQuizzes(res.data.quizzes)
      } catch (err) {
        console.error(err)
      }
    }
    load()
  }, [])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Quizzes</h1>
        <Link href="/upload"><a className="px-3 py-2 bg-green-600 text-white rounded">New Quiz</a></Link>
      </div>

      {quizzes.length === 0 ? (
        <div>No quizzes yet. Create one from the Upload page.</div>
      ) : (
        <div className="space-y-3">
          {quizzes.map(q => (
            <div key={q.id} className="p-4 border rounded bg-white flex items-center justify-between">
              <div>
                <div className="font-semibold">{q.title}</div>
                <div className="text-sm text-gray-500">{new Date(q.createdAt).toLocaleString()}</div>
              </div>
              <div className="space-x-2">
                <Link href={`/quiz/${q.id}`}><a className="px-3 py-1 bg-blue-600 text-white rounded">Preview</a></Link>
                <a href={`/api/export/${q.id}`} className="px-3 py-1 bg-gray-200 rounded">Export CSV</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
