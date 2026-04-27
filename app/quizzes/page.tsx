import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

//asyncにする
export default async function QuizzesPage() {
  const supabase = await createClient();

  //ここでDBから取ってる
  const { data: quizzes, error } = await supabase
    .from("quizzes")
    .select("*")
    .order("title");

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold">クイズ一覧</h1>
        <p className="text-red-500">エラー: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-2 text-3xl font-bold">クイズ一覧</h1>
      <p className="mb-8 text-gray-600">好きなジャンルを選んで遊ぼう！</p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {quizzes?.map((quiz) => (
          <Link
            key={quiz.id}
            href={`/quizzes/${quiz.id}`}
            className="rounded-2xl bg-white p-6 shadow hover:shadow-lg transition"
          >
            <h2 className="mb-2 text-xl font-semibold">{quiz.title}</h2>
            <p className="text-sm text-gray-600">{quiz.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}