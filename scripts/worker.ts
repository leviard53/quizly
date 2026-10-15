#!/usr/bin/env ts-node

import { prisma } from '../lib/prisma'
import { extractTextFromFile } from '../lib/extract'
import path from 'path'
import fs from 'fs'

const OPENAI_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_KEY) {
  console.error('OPENAI_API_KEY not set in environment')
  process.exit(1)
}

async function processJob(job:any) {
  console.log('Processing job', job.id)
  try {
    await prisma.job.update({ where: { id: job.id }, data: { status: 'processing' } })
    const uploadsDir = './uploads'
    const filePath = path.join(uploadsDir, job.fileName)
    if (!fs.existsSync(filePath)) {
      await prisma.job.update({ where: { id: job.id }, data: { status: 'error', error: 'file not found' } })
      return
    }

    const text = await extractTextFromFile(filePath)
    if (!text || text.trim().length < 20) {
      await prisma.job.update({ where: { id: job.id }, data: { status: 'error', error: 'extracted text too short' } })
      return
    }

    // build prompt
    const prompt = `You are an assistant that converts study material into a JSON quiz suitable for import into Kahoot.\n\nRules:\n- Produce exactly ${job.numberOfQuestions} multiple-choice questions.\n- Output only valid JSON with the shape:{\"title\":\"...\",\"questions\":[{\"question\":\"...\",\"choices\":[\"...\"],\"answer\":0}, ...]}\n- Each question should have 4 choices and \"answer\" should be the index (0-3) of the correct choice.\n\nStudy material:\n\"\"\"\n${text}\n\"\"\"\n\nReturn the JSON only.`

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You format output as JSON only.' }, { role: 'user', content: prompt }], temperature: 0.2, max_tokens: 2000 })
    })
    const data = await resp.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      await prisma.job.update({ where: { id: job.id }, data: { status: 'error', error: 'OpenAI returned no content' } })
      return
    }

    // extract JSON
    let parsed: any
    try {
      parsed = JSON.parse(content.trim())
    } catch (e) {
      const start = content.indexOf('{')
      const end = content.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        parsed = JSON.parse(content.slice(start, end + 1))
      } else {
        throw e
      }
    }

    // upsert user
    let user = undefined
    if (job.userId) {
      user = await prisma.user.findUnique({ where: { id: job.userId } })
    }
    if (!user && job.userId) {
      // ignore
    }

    // create quiz
    const quiz = await prisma.quiz.create({ data: { title: parsed.title || `Quiz from ${job.fileName}`, data: JSON.stringify(parsed.questions || []), userId: job.userId || '' } })

    await prisma.job.update({ where: { id: job.id }, data: { status: 'done', resultQuizId: quiz.id } })
    console.log('Job done', job.id, 'quiz', quiz.id)
  } catch (err:any) {
    console.error('Job error', err)
    try { await prisma.job.update({ where: { id: job.id }, data: { status: 'error', error: String(err.message || err) } }) } catch (e) {}
  }
}

async function poll() {
  console.log('Worker polling for jobs...')
  const job = await prisma.job.findFirst({ where: { status: 'queued' }, orderBy: { createdAt: 'asc' } })
  if (job) await processJob(job)
}

async function run() {
  while (true) {
    try { await poll() } catch (e) { console.error(e) }
    await new Promise(r => setTimeout(r, 3000))
  }
}

run()
