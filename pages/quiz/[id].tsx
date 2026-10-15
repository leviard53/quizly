import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'

export default function QuizPage() {
  const router = useRouter()
  const { id } = router.query
  const [quiz, setQuiz] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`/api/quiz/${id}`)
        setQuiz(res.data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchQuiz()
  }, [id])

  if (!quiz) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{quiz.title}</h1>
      <div className="space-y-4">
        {quiz.questions.map((q:any, i:number) => (
          <div key={i} className="p-4 border rounded bg-white">
            <div className="font-semibold">{i+1}. {q.question}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {q.choices.map((c:string, ci:number) => (
                <div key={ci} className={`p-2 rounded ${ci===q.answer? 'bg-green-100': 'bg-gray-50'}`}>{c}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
