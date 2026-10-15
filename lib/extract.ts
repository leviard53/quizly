import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import Tesseract from 'tesseract.js'

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.pdf') {
    const data = await pdfParse(fs.readFileSync(filePath))
    return data.text || ''
  }

  if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ path: filePath })
    return result.value || ''
  }

  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf8')
  }

  // assume image
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng', { logger: () => {} })
    return text || ''
  } catch (err) {
    console.error('OCR error', err)
    return ''
  }
}
