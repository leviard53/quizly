import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'missing id' })

  const quiz = await prisma.quiz.findUnique({ where: { id } })
  if (!quiz) return res.status(404).json({ error: 'quiz not found' })

  const questions = JSON.parse(quiz.data)

  // Build CSV rows for Kahoot import (simple format): Question, Choice A, Choice B, Choice C, Choice D, Correct Answer Text
  const rows = questions.map((q:any) => {
    const correct = q.choices && q.choices[q.answer] ? q.choices[q.answer] : ''
    return [q.question, ...(q.choices || ['','','','']), correct]
  })

  // Build CSV string
  const header = ['Question','Choice A','Choice B','Choice C','Choice D','Correct Answer']
  const escaped = rows.map(r => r.map((c:any) => `"${String(c).replace(/"/g,'""')}"`).join(','))
  const csv = [header.join(','), ...escaped].join('\n')

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="quiz-${quiz.id}.csv"`)
  res.status(200).send(csv)
}
