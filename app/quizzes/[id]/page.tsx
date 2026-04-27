"use client";
//use client を使うページでは、URL の anime みたいな値を useParams() で取ると安定しやすい。

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Question = {
  id: number;
  quiz_id: string;
  question: string;
  choices: string[];
  answer: string;
  question_order: number;
};

type QuizInfo = {
  id: string;
  title: string;
  description: string;
};

export default function QuizDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    async function fetchQuizData() {
      const supabase = createClient();

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", id)
        .single();

      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", id)
        .order("question_order");

      if (quizError || questionError) {
        console.error("データ取得エラー", quizError || questionError);
        setLoading(false);
        return;
      }

      setQuiz(quizData);
      setQuestions(questionData ?? []);
      setLoading(false);
    }

    fetchQuizData();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-2xl font-bold">読み込み中...</h1>
      </main>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">クイズが見つかりません</h1>
        <p className="mt-2 text-gray-600">id: {String(id)}</p>
      </main>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-4 text-4xl font-bold">{quiz.title}</h1>
      <p className="mb-8 text-lg text-gray-700">{quiz.description}</p>

      {!started ? (
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-3 text-2xl font-semibold">このクイズで遊ぶ</h2>
          <p className="mb-4 text-gray-600">
            スタートを押すと1問目が表示されるよ。
          </p>

          <button
            onClick={() => setStarted(true)}
            className="rounded bg-black px-4 py-2 text-white"
          >
            スタート
          </button>
        </div>
      ) : finished ? (
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-3 text-3xl font-bold">クイズ終了！</h2>
          <p className="mb-2 text-lg">
            スコア: {score} / {questions.length}
          </p>
          <p className="mb-6 text-gray-600">
            おつかれさま！もう一回遊べるよ。
          </p>

          <button
            onClick={() => {
              setStarted(false);
              setFinished(false);
              setCurrentIndex(0);
              setSelected(null);
              setIsCorrect(null);
              setScore(0);
            }}
            className="rounded bg-black px-4 py-2 text-white"
          >
            もう一回遊ぶ
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="mb-2 text-sm text-gray-500">第{currentIndex + 1}問</p>
          <p className="mb-4 text-sm text-gray-600">スコア: {score}</p>

          <h2 className="mb-6 text-2xl font-semibold">
            {currentQuestion.question}
          </h2>

          {/* 選択肢 */}
          <div className="grid gap-3">
            {currentQuestion.choices.map((choice) => (
              <button
                key={choice}
                disabled={selected !== null}
                onClick={() => {
                  if (selected !== null) return;

                  setSelected(choice);
                  const correct = choice === currentQuestion.answer;
                  setIsCorrect(correct);
                  //正解したときだけスコアを増やす
                  if (correct) {
                    setScore((prev) => prev + 1);
                  }
                }}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  selected === choice
                    ? choice === currentQuestion.answer
                      ? "bg-green-200"
                      : "bg-red-200"
                    : selected !== null
                      ? "bg-gray-100 text-gray-500"
                      : "bg-white hover:bg-gray-50"
                //下の大かっこの右にしたの文を入れれば?の右でカーソルを変えれる
                // ${selected !== null ? "cursor-not-allowed" : ""}
                }`}
              >
                {choice}
              </button>
            ))}
          </div>

          {/* 次へ、最終確認 */}
          {isCorrect !== null && (
            <>
              <p className="mt-4 text-lg font-bold">
                {isCorrect ? "正解！🎉" : "不正解…😢"}
              </p>

              {/* 答え表示 */}
              {isCorrect === false && (
                <p className="mt-2 text-gray-600">
                  正解は「{currentQuestion.answer}」だよ！
                </p>
              )}

              {/* スコア: {score} */}
              <button
                onClick={() => {
                  if (currentIndex + 1 >= questions.length) {
                    setFinished(true);
                    return;
                  }

                  setCurrentIndex((prev) => prev + 1);
                  setSelected(null);
                  setIsCorrect(null);
                }}
                className="mt-4 rounded bg-black px-4 py-2 text-white"
              >
                {currentIndex + 1 >= questions.length ? "結果を見る" : "次へ"}
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}