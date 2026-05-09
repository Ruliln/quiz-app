import { createClient } from "@/lib/supabase/server";
import QuizSearchList from "./QuizSearchList";

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

export default async function QuizzesPage() {
  const supabase = await createClient();

  const { data: quizzes, error } = await supabase
    .from("quizzes")
    .select(`
      id,
      title,
      description,
      questions (
        question_type,
        media_url,
        media_type
      )
    `)
    .order("title");

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-4 text-white md:p-8">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
          <h1 className="text-3xl font-black">クイズ一覧</h1>
          <p className="mt-4 rounded-2xl bg-red-500/20 p-4 font-bold text-red-200">
            エラー: {error.message}
          </p>
        </div>
      </main>
    );
  }

  const typedQuizzes = (quizzes || []) as Quiz[];

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur md:p-10">
          <p className="mb-3 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-black text-gray-950">
            QUIZ LIBRARY
          </p>

          <h1 className="mb-3 text-4xl font-black md:text-5xl">
            クイズを探そう
          </h1>

          <p className="max-w-2xl text-white/70">
            みんなが作ったクイズで遊ぼう。画像クイズ・動画クイズ・選択式・入力式にも対応しています。
          </p>
        </section>

        <QuizSearchList quizzes={typedQuizzes} />
      </div>
    </main>
  );
}