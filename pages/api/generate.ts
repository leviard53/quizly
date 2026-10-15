import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

// This endpoint is a stub. It should:
// 1) Read the uploaded file (from uploads/jobId...)
// 2) Extract text (pdf/docx/ocr)
// 3) Call OpenAI to generate multiple-choice questions
// 4) Save quiz to DB and return preview

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { jobId } = req.body
  if (!jobId) return res.status(400).json({ error: 'missing jobId' })

  // locate file
  const uploadsDir = './uploads'
  const files = fs.readdirSync(uploadsDir)
  const match = files.find(f => f.includes(jobId))
  if (!match) return res.status(404).json({ error: 'file not found' })
  const filePath = path.join(uploadsDir, match)

  // simplified: return a fake quiz for now
  const fakeQuiz = {
    title: 'Sample Quiz',
    questions: [
      { id: 1, question: 'What is 2+2?', choices: ['1','2','3','4'], answer: 3 }
    ]
  }

  return res.json({ quiz: fakeQuiz })
}
