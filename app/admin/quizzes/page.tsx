"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Quiz = {
  id: string;
  title: string;
  description: string;
};

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [message, setMessage] = useState("");

  async function fetchQuizzes() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("quizzes")
      .select("id, title, description")
      .order("title");

    if (error) {
      setMessage(`取得エラー: ${error.message}`);
      return;
    }

    setQuizzes(data || []);
  }

  async function deleteQuiz(id: string) {
    const ok = confirm(`「${id}」を削除していい？`);
    if (!ok) return;

    const supabase = createClient();

    const { error } = await supabase.from("quizzes").delete().eq("id", id);

    if (error) {
      setMessage(`削除エラー: ${error.message}`);
      return;
    }

    setMessage("削除したよ");
    fetchQuizzes();
  }

  useEffect(() => {
    fetchQuizzes();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-4 text-white md:p-8">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
          <p className="mb-3 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-black text-gray-950">
            ADMIN STUDIO
          </p>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-black md:text-5xl">
                クイズ管理
              </h1>
              <p className="mt-3 font-bold text-white/80">
                作成したクイズを編集・確認・削除できます。
              </p>
            </div>

            <Link
              href="/admin/create-quiz"
              className="rounded-2xl bg-pink-500 px-6 py-4 text-center font-black text-white shadow-lg shadow-pink-500/40 hover:bg-pink-400"
            >
              ＋ 新しいクイズを作る
            </Link>
          </div>
        </section>

        {message && (
          <p className="mb-6 rounded-2xl border border-white/10 bg-white/10 p-4 font-bold text-white/90">
            {message}
          </p>
        )}

        <div className="grid gap-5">
          {quizzes.map((quiz) => (
            <article
              key={quiz.id}
              className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur transition hover:-translate-y-1 hover:bg-white/15"
            >
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black text-cyan-300">
                    ID: {quiz.id}
                  </p>

                  <h2 className="text-3xl font-black">
                    {quiz.title}
                  </h2>

                  <p className="mt-2 font-bold text-white/75">
                    {quiz.description || "説明なし"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/quizzes/${quiz.id}/edit`}
                    className="rounded-2xl border border-cyan-300 bg-white/5 px-4 py-3 font-black text-cyan-300 shadow-lg shadow-cyan-400/20 hover:bg-cyan-300 hover:text-gray-950"
                  >
                    編集
                  </Link>

                  <Link
                    href={`/quizzes/${quiz.id}`}
                    className="rounded-2xl border border-white/20 bg-white px-4 py-3 font-black text-gray-950 hover:bg-gray-100"
                  >
                    確認
                  </Link>

                  <button
                    onClick={() => deleteQuiz(quiz.id)}
                    className="rounded-2xl bg-red-500 px-4 py-3 font-black text-white shadow-lg shadow-red-500/30 hover:bg-red-400"
                  >
                    削除
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {quizzes.length === 0 && (
          <div className="rounded-[2rem] border border-white/10 bg-white/10 p-10 text-center shadow-2xl backdrop-blur">
            <p className="text-xl font-black text-white/80">
              まだクイズがありません
            </p>
          </div>
        )}
      </div>
    </main>
  );
}