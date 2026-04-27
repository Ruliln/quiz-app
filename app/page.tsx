import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-4 text-4xl font-bold">🎮 Quiz App</h1>
      <p className="mb-6">いろんなジャンルのクイズで遊ぼう！</p>

      <div className="flex flex-wrap gap-4">
        <Link href="/quizzes" className="rounded bg-black px-4 py-2 text-white">
          クイズ一覧へ
        </Link>

        <Link href="/room/create" className="rounded border px-4 py-2">
          ルーム作成
        </Link>

        <Link href="/room/join" className="rounded border px-4 py-2">
          PINで参加
        </Link>
      </div>
    </main>
  );
}