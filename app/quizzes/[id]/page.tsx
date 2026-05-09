"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Question = {
  id: number;
  quiz_id: string;
  question: string;
  choices: string[];
  answer: string;
  question_order: number;
  question_type: "choice" | "input";
  media_url: string | null;
  media_type: "image" | "video" | null;
  clip_start: number | null;
  clip_end: number | null;
};

type QuizInfo = {
  id: string;
  title: string;
  description: string;
};

export default function QuizDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");

  const [playTimerSeconds, setPlayTimerSeconds] = useState("");
  const [playQuestionLimit, setPlayQuestionLimit] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const playableQuestions = playQuestionLimit
    ? questions.slice(0, Math.min(Number(playQuestionLimit), questions.length))
    : questions;

  const currentQuestion = playableQuestions[currentIndex];

  async function copyShareUrl() {
    const url = window.location.href;

    await navigator.clipboard.writeText(url);

    alert("URLをコピーしたよ！");
  }

  function checkAnswer(userAnswer: string) {
    if (!currentQuestion) return;

    const correct =
      userAnswer.trim().toLowerCase() ===
      currentQuestion.answer.trim().toLowerCase();

    setSelected(userAnswer || "input");
    setIsCorrect(correct);

    if (correct) {
      setScore((prev) => prev + 1);
    }
  }

  useEffect(() => {
    async function fetchQuizData() {
      const supabase = createClient();

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("id, title, description")
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

  useEffect(() => {
    if (!started) return;
    if (finished) return;
    if (!currentQuestion) return;
    if (currentQuestion.media_type !== "video") return;
    if (!videoRef.current) return;

    const video = videoRef.current;
    const start = currentQuestion.clip_start ?? 0;
    const end = currentQuestion.clip_end;

    video.currentTime = start;
    video.play();

    if (!end) return;

    const timer = setInterval(() => {
      if (video.currentTime >= end) {
        video.pause();
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [started, finished, currentIndex, currentQuestion]);

  useEffect(() => {
    if (!started) return;
    if (finished) return;
    if (!currentQuestion) return;
    if (!playTimerSeconds) {
      setTimeLeft(null);
      return;
    }
    if (isCorrect !== null) return;

    setTimeLeft(Number(playTimerSeconds));

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;

        if (prev <= 1) {
          clearInterval(timer);
          checkAnswer("");
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    started,
    finished,
    currentIndex,
    currentQuestion,
    playTimerSeconds,
    isCorrect,
  ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-8 text-white">
        <h1 className="text-2xl font-black">読み込み中...</h1>
      </main>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-8 text-white">
        <h1 className="text-2xl font-black">クイズが見つかりません</h1>
        <p className="mt-2 text-white/80">id: {String(id)}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-4 text-white md:p-8">
      <button
        onClick={() => router.push("/")}
        className="mb-6 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
      >
        ← ホーム
      </button>

      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">          <h1 className="mb-3 text-4xl font-black md:text-5xl">
            {quiz.title}
          </h1>
          <p className="text-lg font-bold text-white/90">
            {quiz.description}
          </p>
        </section>
        <button
          onClick={copyShareUrl}
          className="mt-4 rounded-2xl bg-cyan-400 px-5 py-3 font-black text-gray-950 shadow-lg shadow-cyan-400/40 hover:bg-cyan-300"
        >
          🔗 クイズURLをコピー
        </button>

        {!started ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-500 text-3xl shadow-lg shadow-pink-500/40">
                  🎮
                </div>

                <div>
                  <h2 className="text-3xl font-black">このクイズで遊ぶ</h2>
                  <p className="mt-1 font-bold text-white/90">
                    設定を選んでから
                    <span className="text-yellow-300">スタート</span>してね。
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-black text-white">
                    出題数
                  </label>
                  <select
                    value={playQuestionLimit}
                    onChange={(e) => setPlayQuestionLimit(e.target.value)}
                    className="w-full rounded-2xl border border-white/30 bg-white/10 px-4 py-4 text-lg font-black text-white outline-none focus:ring-4 focus:ring-cyan-300/30"
                  >
                    <option className="text-gray-950" value="">
                      全部出題する
                    </option>
                    <option className="text-gray-950" value="10">
                      10問
                    </option>
                    <option className="text-gray-950" value="20">
                      20問
                    </option>
                    <option className="text-gray-950" value="30">
                      30問
                    </option>
                    <option className="text-gray-950" value="50">
                      50問
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-white">
                    制限時間
                  </label>
                  <select
                    value={playTimerSeconds}
                    onChange={(e) => setPlayTimerSeconds(e.target.value)}
                    className="w-full rounded-2xl border border-white/30 bg-white/10 px-4 py-4 text-lg font-black text-white outline-none focus:ring-4 focus:ring-pink-300/30"
                  >
                    <option className="text-gray-950" value="">
                      タイマーなし
                    </option>
                    <option className="text-gray-950" value="3">
                      3秒
                    </option>
                    <option className="text-gray-950" value="5">
                      5秒
                    </option>
                    <option className="text-gray-950" value="10">
                      10秒
                    </option>
                    <option className="text-gray-950" value="30">
                      30秒
                    </option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setStarted(true);
                    setCurrentIndex(0);
                    setFinished(false);
                    setSelected(null);
                    setIsCorrect(null);
                    setScore(0);
                    setTypedAnswer("");
                  }}
                  className="rounded-2xl bg-pink-500 px-8 py-4 text-xl font-black text-white shadow-lg shadow-pink-500/40 hover:bg-pink-400"
                >
                  ▶ スタート！
                </button>
              </div>
            </section>

            <aside className="rounded-[2rem] border border-white/10 bg-gray-950/50 p-6 shadow-2xl backdrop-blur">
              <h2 className="mb-5 text-2xl font-black">クイズ情報</h2>

              <div className="space-y-4">
                <div className="rounded-3xl bg-white/10 p-5">
                  <p className="text-sm font-bold text-white/60">問題数</p>
                  <p className="text-3xl font-black">{questions.length}問</p>
                </div>

                <div className="rounded-3xl bg-white/10 p-5">
                  <p className="text-sm font-bold text-white/60">遊び方</p>
                  <p className="mt-1 font-bold text-white/90">
                    選択式はボタンを押して、入力式は答えを入力しよう！
                  </p>
                </div>
              </div>
            </aside>
          </div>
        ) : finished ? (
          <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/10 p-8 text-center shadow-2xl backdrop-blur">
            <p className="mb-2 text-5xl">🎉</p>
            <h2 className="mb-4 text-4xl font-black">クイズ終了！</h2>

            <div className="mx-auto mb-6 max-w-sm rounded-3xl bg-gray-950/60 p-6">
              <p className="text-sm font-bold text-white/60">スコア</p>
              <p className="text-5xl font-black text-cyan-300">
                {score} / {playableQuestions.length}
              </p>
            </div>

            <button
              onClick={() => {
                setStarted(false);
                setFinished(false);
                setCurrentIndex(0);
                setSelected(null);
                setIsCorrect(null);
                setScore(0);
                setTypedAnswer("");
              }}
              className="rounded-2xl bg-pink-500 px-8 py-4 text-lg font-black text-white shadow-lg shadow-pink-500/40 hover:bg-pink-400"
            >
              もう一回遊ぶ
            </button>
          </section>
        ) : (
          <section className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-black text-white">
                  第{currentIndex + 1}問 / 全{playableQuestions.length}問
                </p>
                <p className="mt-1 text-lg font-black text-cyan-300">
                  スコア: {score}
                </p>
              </div>

              {timeLeft !== null && (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pink-500 text-3xl font-black shadow-lg shadow-pink-500/40">
                  {timeLeft}
                </div>
              )}
            </div>

            {currentQuestion.media_type === "image" &&
              currentQuestion.media_url && (
                <div className="mb-6 overflow-hidden rounded-3xl bg-gray-950/50 p-4">
                  <img
                    src={currentQuestion.media_url}
                    alt="quiz image"
                    className="mx-auto max-h-[420px] rounded-2xl object-contain"
                  />
                </div>
              )}

            {currentQuestion.media_type === "video" &&
              currentQuestion.media_url && (
                <div className="mb-6 overflow-hidden rounded-3xl bg-gray-950/50 p-4">
                  <video
                    ref={videoRef}
                    src={currentQuestion.media_url}
                    controls
                    muted
                    className="mx-auto max-h-[420px] rounded-2xl"
                  />
                </div>
              )}

            <div className="mb-6 rounded-3xl bg-gray-950/60 p-6 text-center">
              <h2 className="text-2xl font-black md:text-3xl">
                {currentQuestion.question}
              </h2>
            </div>

            {currentQuestion.question_type === "choice" ? (
              <div className="grid gap-4">
                {currentQuestion.choices.map((choice, index) => {
                  const correct = choice === currentQuestion.answer;
                  const isSelected = selected === choice;
                  const borderColor =
                    index % 2 === 0
                      ? "border-pink-400 shadow-pink-500/40"
                      : "border-cyan-400 shadow-cyan-400/40";

                  return (
                    <button
                      key={choice}
                      disabled={selected !== null}
                      onClick={() => {
                        if (selected !== null) return;
                        checkAnswer(choice);
                      }}
                      className={`flex min-h-20 items-center gap-4 rounded-3xl border-2 bg-white px-5 py-4 text-left text-xl font-black text-gray-950 shadow-lg transition hover:scale-[1.01] disabled:cursor-not-allowed ${borderColor} ${
                        selected !== null && !isSelected
                          ? "opacity-50"
                          : "opacity-100"
                      } ${
                        selected !== null && isSelected && correct
                          ? "ring-4 ring-green-300"
                          : ""
                      } ${
                        selected !== null && isSelected && !correct
                          ? "ring-4 ring-red-300"
                          : ""
                      }`}
                    >
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white ${
                          index % 2 === 0 ? "bg-pink-500" : "bg-cyan-400"
                        }`}
                      >
                        {index + 1}
                      </span>
                      {choice}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl bg-gray-950/40 p-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <input
                    value={typedAnswer}
                    disabled={selected !== null}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    className="flex-1 rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 text-lg font-bold text-white outline-none placeholder:text-white/50 focus:ring-4 focus:ring-cyan-300/30"
                    placeholder="答えを入力"
                  />

                  <button
                    disabled={selected !== null}
                    onClick={() => {
                      if (selected !== null) return;
                      checkAnswer(typedAnswer);
                    }}
                    className="rounded-2xl bg-cyan-400 px-8 py-4 text-lg font-black text-gray-950 shadow-lg shadow-cyan-400/40 disabled:opacity-50"
                  >
                    回答
                  </button>
                </div>
              </div>
            )}

            {isCorrect !== null && (
              <div className="mt-6 rounded-3xl bg-white p-6 text-center text-gray-950 shadow-2xl">
                <p className="text-3xl font-black">
                  {selected === "input" && !typedAnswer
                    ? "時間切れ！⏰"
                    : isCorrect
                      ? "正解！🎉"
                      : "不正解…😢"}
                </p>

                {isCorrect === false && (
                  <p className="mt-2 font-bold text-gray-600">
                    正解は「{currentQuestion.answer}」だよ！
                  </p>
                )}

                <button
                  onClick={() => {
                    if (currentIndex + 1 >= playableQuestions.length) {
                      setFinished(true);
                      return;
                    }

                    setCurrentIndex((prev) => prev + 1);
                    setSelected(null);
                    setIsCorrect(null);
                    setTypedAnswer("");
                  }}
                  className="mt-5 rounded-2xl bg-gray-950 px-8 py-3 font-black text-white"
                >
                  {currentIndex + 1 >= playableQuestions.length
                    ? "結果を見る"
                    : "次へ"}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}