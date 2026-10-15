import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'missing id' })

  const job = await prisma.job.findUnique({ where: { id } })
  if (!job) return res.status(404).json({ error: 'job not found' })

  return res.json({ id: job.id, status: job.status, error: job.error, resultQuizId: job.resultQuizId })
}
