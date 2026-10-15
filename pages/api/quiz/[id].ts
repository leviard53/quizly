import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'missing id' })
  const quiz = await prisma.quiz.findUnique({ where: { id } })
  if (!quiz) return res.status(404).json({ error: 'quiz not found' })
  return res.json({ title: quiz.title, questions: JSON.parse(quiz.data) })
}
