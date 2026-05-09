"use client";

import { useState } from "react";
import Link from "next/link";

type Quiz = {
  id: string;
  title: string;
  description: string;
  questions: {
    question_type: string;
    media_url: string | null;
    media_type: string | null;
  }[];
};

export default function QuizSearchList({
  quizzes,
}: {
  quizzes: Quiz[];
}) {
  const [keyword, setKeyword] = useState("");

  const filteredQuizzes = quizzes.filter((quiz) => {
    const text = `${quiz.title} ${quiz.description}`.toLowerCase();

    return text.includes(keyword.toLowerCase());
  });

  return (
    <>
      <div className="mb-8">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="クイズを検索..."
          className="w-full rounded-3xl border border-white/10 bg-white/10 px-6 py-5 text-lg font-bold text-white placeholder:text-white/40 outline-none backdrop-blur focus:ring-4 focus:ring-cyan-300/30"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {filteredQuizzes.map((quiz) => {
          const thumbnailQuestion = quiz.questions.find(
            (q) => q.media_type === "image" && q.media_url
          );

          const hasInputQuiz = quiz.questions.some(
            (q) => q.question_type === "input"
          );

          const hasChoiceQuiz = quiz.questions.some(
            (q) => q.question_type === "choice"
          );

          return (
            <article
              key={quiz.id}
              className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 shadow-2xl backdrop-blur transition duration-300 hover:-translate-y-2 hover:bg-white/15"
            >
              <div className="relative flex h-56 items-center justify-center overflow-hidden bg-gray-950/40">
                {thumbnailQuestion?.media_url ? (
                  <img
                    src={thumbnailQuestion.media_url}
                    alt={quiz.title}
                    className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="text-7xl">🎮</div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>

              <div className="p-6 text-white">
                <div className="mb-4 flex flex-wrap gap-2">
                  {hasChoiceQuiz && (
                    <span className="rounded-full bg-cyan-400 px-3 py-1 text-xs font-black text-gray-950">
                      選択式
                    </span>
                  )}

                  {hasInputQuiz && (
                    <span className="rounded-full bg-pink-500 px-3 py-1 text-xs font-black text-white">
                      入力式
                    </span>
                  )}

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/80">
                    {quiz.questions.length}問
                  </span>
                </div>

                <h2 className="mb-2 text-3xl font-black leading-tight">
                  {quiz.title}
                </h2>

                <p className="mb-6 line-clamp-2 text-sm text-white/65">
                  {quiz.description || "クイズ説明なし"}
                </p>

                <div className="flex gap-3">
                  <Link
                    href={`/quizzes/${quiz.id}`}
                    className="flex-1 rounded-2xl bg-pink-500 px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-pink-500/30 transition hover:bg-pink-400"
                  >
                    ひとりで遊ぶ
                  </Link>

                  <Link
                    href={`/room/create?quizId=${quiz.id}`}
                    className="flex-1 rounded-2xl bg-cyan-400 px-4 py-3 text-center text-sm font-black text-gray-950 shadow-lg shadow-cyan-400/30 transition hover:bg-cyan-300"
                  >
                    ルーム作成
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filteredQuizzes.length === 0 && (
        <div className="mt-16 rounded-3xl border border-white/10 bg-white/10 p-10 text-center backdrop-blur">
          <p className="text-xl font-black text-white/70">
            クイズが見つかりませんでした 😢
          </p>
        </div>
      )}
    </>
  );
}