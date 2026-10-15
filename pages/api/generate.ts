import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { extractTextFromFile } from '../../lib/extract'
import { prisma } from '../../lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'

// Note: this endpoint expects to be called with { jobId, numberOfQuestions }
// jobId is the filename returned by the upload endpoint (file saved in ./uploads).

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions as any)
  if (!session || !session.user || !session.user.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { jobId, numberOfQuestions = 10 } = req.body
  if (!jobId) return res.status(400).json({ error: 'missing jobId' })

  const uploadsDir = './uploads'
  if (!fs.existsSync(uploadsDir)) return res.status(500).json({ error: 'uploads dir missing' })

  const files = fs.readdirSync(uploadsDir)
  const match = files.find(f => f.includes(jobId))
  if (!match) return res.status(404).json({ error: 'file not found' })
  const filePath = path.join(uploadsDir, match)

  // extract text
  let text = ''
  try {
    text = await extractTextFromFile(filePath)
  } catch (err:any) {
    console.error('extract error', err)
    return res.status(500).json({ error: 'text extraction failed' })
  }

  if (!text || text.trim().length < 20) {
    return res.status(400).json({ error: 'extracted text too short to generate quiz' })
  }

  // Prepare prompt to OpenAI
  const prompt = `You are an assistant that converts study material into a JSON quiz suitable for import into Kahoot.\n\nRules:\n- Produce exactly ${numberOfQuestions} multiple-choice questions.\n- Output only valid JSON with the shape: {"title":"...","questions":[{"question":"...","choices":["..."],"answer":0}, ...]}\n- Each question should have 4 choices and "answer" should be the index (0-3) of the correct choice.\n- Keep questions concise and clear, suitable for classroom quizzes.\n\nStudy material:\n"""\n${text}\n"""\n\nReturn the JSON only.`

  // Call OpenAI REST API using fetch
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return res.status(500).json({ error: 'OpenAI key not configured' })

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You format output as JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1500
      })
    })

    const data = await resp.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      console.error('openai no content', data)
      return res.status(500).json({ error: 'OpenAI returned no content' })
    }

    // Try to parse JSON from response; sometimes there are surrounding backticks or text
    const jsonMatch = content.trim()

    let parsed: any
    try {
      parsed = JSON.parse(jsonMatch)
    } catch (err) {
      // Try to extract JSON substring
      const start = content.indexOf('{')
      const end = content.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        try {
          parsed = JSON.parse(content.slice(start, end + 1))
        } catch (e) {
          console.error('json parse failed', e)
          return res.status(500).json({ error: 'Failed to parse OpenAI output' })
        }
      } else {
        console.error('no json in openai response')
        return res.status(500).json({ error: 'No JSON found in OpenAI output' })
      }
    }

    // Upsert user by email
    const userEmail = session.user.email
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: { email: userEmail, name: session.user.name ?? undefined }
    })

    // Save quiz
    const quiz = await prisma.quiz.create({
      data: {
        title: parsed.title || `Quiz from ${match}`,
        data: JSON.stringify(parsed.questions || []),
        userId: user.id
      }
    })

    return res.json({ quizId: quiz.id, quiz: parsed })
  } catch (err:any) {
    console.error('generation error', err)
    return res.status(500).json({ error: 'generation failed' })
  }
}
