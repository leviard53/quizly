import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { prisma } from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions as any)
  if (!session || !session.user || !session.user.email) return res.status(401).json({ error: 'Unauthorized' })

  const userEmail = session.user.email
  const user = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!user) return res.status(404).json({ error: 'user not found' })

  const quizzes = await prisma.quiz.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
  return res.json({ quizzes: quizzes.map(q => ({ id: q.id, title: q.title, createdAt: q.createdAt })) })
}
