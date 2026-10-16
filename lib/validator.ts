import Ajv, { JSONSchemaType } from 'ajv'

type Question = {
  question: string
  choices: string[]
  answer: number
}

type Quiz = {
  title: string
  questions: Question[]
}

const ajv = new Ajv({ allErrors: true, strict: false })

const questionSchema: JSONSchemaType<Question> = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    choices: {
      type: 'array',
      items: { type: 'string' },
      minItems: 4,
      maxItems: 4
    },
    answer: { type: 'integer', minimum: 0, maximum: 3 }
  },
  required: ['question', 'choices', 'answer'],
  additionalProperties: false
}

const quizSchema: JSONSchemaType<Quiz> = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    questions: { type: 'array', items: questionSchema }
  },
  required: ['title', 'questions'],
  additionalProperties: false
}

export const validateQuiz = (obj: any) => {
  const validate = ajv.compile(quizSchema)
  const valid = validate(obj)
  if (!valid) return { valid: false, errors: validate.errors }
  return { valid: true }
}
