import Head from 'next/head'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function Home() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <Head>
        <title>Quizly — AI quiz maker</title>
      </Head>

      <main className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">Quizly</h1>
        <p className="mb-6">Upload documents or images and Quizly will generate Kahoot-style quizzes for you.</p>

        {!session ? (
          <div>
            <button onClick={() => signIn('google')} className="px-4 py-2 bg-blue-600 text-white rounded">Sign in with Google</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p>Signed in as {session.user?.email}</p>
            <div className="flex space-x-2">
              <Link href="/upload"><a className="px-4 py-2 bg-green-600 text-white rounded">Create a Quiz</a></Link>
              <button onClick={() => signOut()} className="px-4 py-2 bg-gray-300 rounded">Sign out</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
