import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = {
  api: { bodyParser: false }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const form = new formidable.IncomingForm()
  form.uploadDir = './uploads'
  form.keepExtensions = true

  if (!fs.existsSync(form.uploadDir)) fs.mkdirSync(form.uploadDir, { recursive: true })

  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Upload error' })
    const file = files.file as formidable.File
    // For the starter we return a jobId pointing to the saved file path
    const jobId = path.basename(file.filepath || file.path)
    return res.json({ jobId })
  })
}
