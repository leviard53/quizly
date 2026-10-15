# Quizly

Quizly is an AI-powered quiz maker. Upload study materials (PDF/DOCX/TXT/PNG/JPG) and Quizly will generate multiple-choice questions you can export to Kahoot.

Quickstart (local):

1. Clone
   git clone https://github.com/leviard53/quizly
   cd quizly

2. Install
   npm install

3. Copy env
   cp .env.example .env
   Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OPENAI_API_KEY, and NEXTAUTH_SECRET

4. Run migrations (Prisma)
   npx prisma migrate dev --name init

5. Run
   npm run dev

Open http://localhost:3000

What I scaffolded
- Next.js + TypeScript app
- Google sign-in stub using NextAuth
- Upload page and simple server upload handler (stores files in /uploads)
- API stub to generate a quiz from an uploaded file (returns a fake quiz for now)
- Prisma schema (SQLite dev ready)
- .env.example with required variables

Next steps I will do if you want me to continue
- Implement text extraction for PDFs/DOCX and OCR for images
- Integrate OpenAI prompt to convert text into MCQs
- Save quizzes to the database and show previews
- Implement Kahoot XLS/CSV export and (optional) direct publish if Kahoot API permits
- Add tests, CI, and deploy to Vercel
