#!/usr/bin/env ts-node

import { prisma } from '../lib/prisma'
import { extractTextFromFile } from '../lib/extract'
import path from 'path'
import fs from 'fs'
import { validateQuiz } from '../lib/validator'

const OPENAI_KEY = process.env.OPENAI_API_KEY

const MAX_RETRIES = 2
const POLL_INTERVAL_MS = 3000

function timeoutFetch(url: string, opts: any, timeout = 20_000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(id))
}

function simpleFakeGenerator(text: string, num = 5) {
  // naive fallback: split into sentences and create simple questions
  const sentences = text.replace(/\s+/g, ' ').split('.').map(s => s.trim()).filter(Boolean)
  const questions:any[] = []
  for (let i = 0; i < Math.min(num, sentences.length); i++) {
    const s = sentences[i]
    const choices = [s, 'Incorrect A', 'Incorrect B', 'Incorrect C']
    questions.push({ question: s.slice(0, 120), choices, answer: 0 })
  }
  return { title: 'Demo Quiz (fallback)', questions }
}

async function callOpenAI(prompt: string, model = 'gpt-4o-mini') {
  if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY not set')

  const body = {
    model,
    messages: [{ role: 'system', content: 'You must output JSON only, no surrounding text.' }, { role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 2000
  }

  const res = await timeoutFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify(body)
  }, 25_000)

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`OpenAI error: ${res.status} ${res.statusText} ${txt}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI returned no content')
  return content
}

function extractJson(content: string) {
  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed)
  } catch (e) {
    // try to find first { ... }
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      const substr = trimmed.slice(start, end + 1)
      return JSON.parse(substr)
    }
    throw e
  }
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

    // simple chunking by characters to avoid overly large prompts
    const CHUNK_SIZE = 3000
    const chunks: string[] = []
    for (let i = 0; i < text.length; i += CHUNK_SIZE) chunks.push(text.slice(i, i + CHUNK_SIZE))

    // If there are multiple chunks, concisely summarize each chunk to reduce prompt size
    let summarized = ''
    if (chunks.length === 1) summarized = chunks[0]
    else {
      const summaries: string[] = []
      for (const c of chunks) {
        try {
          const prompt = `Summarize the following text in 2-3 short bullet points. Output only plain text bullets.\n\nText:\n"""\n${c}\n"""`
          const out = await callOpenAI(prompt, 'gpt-4o-mini')
          // remove newlines, keep short
          summaries.push(out.replace(/\n+/g, ' ').slice(0, 400))
        } catch (e) {
          console.warn('summarize failed, using chunk raw')
          summaries.push(c.slice(0, 800))
        }
      }
      summarized = summaries.join('\n')
    }

    // build generation prompt
    const generationPrompt = `You are an assistant that converts study material into a JSON quiz suitable for import into Kahoot.\n\nRules:\n- Produce exactly ${job.numberOfQuestions} multiple-choice questions.\n- Output only valid JSON with the shape: {"title":"...","questions":[{"question":"...","choices":["...","...","...","..."],"answer":0}, ...]}\n- Each question should have 4 choices and \"answer\" should be the index (0-3) of the correct choice.\n- Keep questions concise and clear.\n\nHere is the summarized study material:\n"""\n${summarized}\n"""\n\nReturn the JSON only.`

    let attempt = 0
    let parsed: any = null
    while (attempt <= MAX_RETRIES && !parsed) {
      try {
        let aiContent: string
        if (!OPENAI_KEY) {
          // fallback
          const fake = simpleFakeGenerator(text, job.numberOfQuestions || 5)
          parsed = fake
          break
        } else {
          aiContent = await callOpenAI(generationPrompt)
        }

        // attempt to parse
        try {
          parsed = extractJson(aiContent)
        } catch (e) {
          console.warn('Failed to parse JSON from OpenAI response, attempt', attempt)
          // try to nudge the model for pure JSON
          if (attempt < MAX_RETRIES && OPENAI_KEY) {
            const fixPrompt = `The previous response was not valid JSON. Please return ONLY the JSON with no commentary. Here is the previous response:\n\n${aiContent}`
            aiContent = await callOpenAI(fixPrompt)
            parsed = extractJson(aiContent)
          } else {
            throw e
          }
        }

        // validate schema
        const v = validateQuiz(parsed)
        if (!v.valid) {
          throw new Error('Validation failed: ' + JSON.stringify(v.errors))
        }

      } catch (err:any) {
        attempt++
        console.error('Generation attempt failed:', err.message || err)
        if (attempt > MAX_RETRIES) {
          // give up
          await prisma.job.update({ where: { id: job.id }, data: { status: 'error', error: String(err.message || err) } })
          return
        }
        // wait a bit before retrying
        await new Promise(r => setTimeout(r, 1000 * attempt))
      }
    }

    if (!parsed) {
      await prisma.job.update({ where: { id: job.id }, data: { status: 'error', error: 'Failed to generate quiz' } })
      return
    }

    // create quiz
    const userId = job.userId || undefined
    const quiz = await prisma.quiz.create({ data: { title: parsed.title || `Quiz from ${job.fileName}`, data: JSON.stringify(parsed.questions || []), userId: userId || '' } })

    await prisma.job.update({ where: { id: job.id }, data: { status: 'done', resultQuizId: quiz.id } })
    console.log('Job done', job.id, 'quiz', quiz.id)
  } catch (err:any) {
    console.error('Job error', err)
    try { await prisma.job.update({ where: { id: job.id }, data: { status: 'error', error: String(err.message || err) } }) } catch (e) {}
  }
}

async function poll() {
  const job = await prisma.job.findFirst({ where: { status: 'queued' }, orderBy: { createdAt: 'asc' } })
  if (job) await processJob(job)
}

async function run() {
  console.log('Worker started — polling for jobs')
  while (true) {
    try { await poll() } catch (e) { console.error(e) }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
}

run()
