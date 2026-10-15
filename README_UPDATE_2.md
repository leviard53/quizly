Updated: background job model, DB-backed job queue, upload enqueues jobs, job status endpoint, worker script (scripts/worker.ts), and upload UI now polls job status.

How to run the worker locally:

1) Install dev dependency ts-node:
   npm install --save-dev ts-node @types/node

2) Ensure .env has OPENAI_API_KEY and DATABASE_URL

3) Start the worker (in a separate terminal):
   npx ts-node scripts/worker.ts

The worker polls for queued jobs, processes them by extracting text, calling OpenAI, saving the quiz, and updating job status.
