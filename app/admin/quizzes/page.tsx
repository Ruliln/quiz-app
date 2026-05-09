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

    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", id);

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
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-6 text-3xl font-bold">クイズ管理</h1>

      <div className="mb-4">
        <Link
          href="/admin/create-quiz"
          className="rounded bg-black px-4 py-2 text-white"
        >
          新しいクイズを作る
        </Link>
      </div>

      {message && <p className="mb-4 text-sm text-gray-700">{message}</p>}

      <div className="grid gap-4">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="rounded-2xl bg-white p-5 shadow"
          >
            <div className="mb-4">
              <h2 className="text-xl font-bold">{quiz.title}</h2>
              <p className="text-sm text-gray-500">ID: {quiz.id}</p>
              <p className="mt-2 text-gray-700">{quiz.description}</p>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/admin/quizzes/${quiz.id}/edit`}
                className="rounded border px-3 py-2"
              >
                編集
              </Link>

              <Link
                href={`/quizzes/${quiz.id}`}
                className="rounded border px-3 py-2"
              >
                確認
              </Link>

              <button
                onClick={() => deleteQuiz(quiz.id)}
                className="rounded bg-red-600 px-3 py-2 text-white"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}