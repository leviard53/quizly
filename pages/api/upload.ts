import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { prisma } from '../../lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'

export const config = {
  api: { bodyParser: false }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions as any)
  if (!session || !session.user || !session.user.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const form = new formidable.IncomingForm()
  form.uploadDir = './uploads'
  form.keepExtensions = true

  if (!fs.existsSync(form.uploadDir)) fs.mkdirSync(form.uploadDir, { recursive: true })

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Upload error' })
    const file = files.file as formidable.File
    const savedName = path.basename(file.filepath || (file as any).path)

    // create a job record in DB
    try {
      const job = await prisma.job.create({
        data: {
          fileName: savedName,
          status: 'queued',
          numberOfQuestions: Number(fields.numberOfQuestions ?? 10),
          user: { connect: { email: session.user!.email! } }
        }
      })

      return res.json({ jobId: job.id })
    } catch (e:any) {
      console.error('prisma job create error', e)
      return res.status(500).json({ error: 'Failed to create job' })
    }
  })
}
