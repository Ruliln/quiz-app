"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type QuestionType = "choice" | "input";
type MediaType = "image" | "video" | "";

type QuizQuestion = {
  question: string;
  choices: string[];
  answer: string;
  questionType: QuestionType;
  mediaFile: File | null;
  previewUrl: string;
  mediaType: MediaType;
  clipStart: string;
  clipEnd: string;
};

function createEmptyQuestion(): QuizQuestion {
  return {
    question: "",
    choices: ["", ""],
    answer: "",
    questionType: "choice",
    mediaFile: null,
    previewUrl: "",
    mediaType: "",
    clipStart: "",
    clipEnd: "",
  };
}

export default function CreateQuizPage() {
  const router = useRouter();

  const [quizId, setQuizId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    createEmptyQuestion(),
  ]);

  const [message, setMessage] = useState("");

  function updateQuestion(index: number, newQuestion: Partial<QuizQuestion>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...newQuestion } : q))
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  }

  function removeQuestion(index: number) {
    if (questions.length === 1) {
      setMessage("問題は1問以上必要だよ");
      return;
    }

    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreateQuiz() {
    if (!quizId || !title || !description) {
      setMessage("クイズ情報を入力してね");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (!q.question || !q.answer) {
        setMessage(`第${i + 1}問の問題文と正解を入力してね`);
        return;
      }

      const validChoices = q.choices.filter((choice) => choice.trim() !== "");

      if (q.questionType === "choice" && validChoices.length < 2) {
        setMessage(`第${i + 1}問の選択肢は2つ以上必要だよ`);
        return;
      }

      if (q.questionType === "choice" && !validChoices.includes(q.answer)) {
        setMessage(`第${i + 1}問の正解は選択肢の中から選んでね`);
        return;
      }

      if (q.questionType === "input" && (!q.mediaType || !q.mediaFile)) {
        setMessage(`第${i + 1}問の画像か動画を選んでね`);
        return;
      }
    }

    const supabase = createClient();

    const { error: quizError } = await supabase.from("quizzes").insert({
      id: quizId,
      title,
      description,
    });

    if (quizError) {
      setMessage(`クイズ作成エラー: ${quizError.message}`);
      return;
    }

    const questionRows = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      let uploadedMediaUrl = "";

      if (q.questionType === "input" && q.mediaFile) {
        const fileExt = q.mediaFile.name.split(".").pop();
        const fileName = `${Date.now()}-${i}.${fileExt}`;
        const filePath = `${quizId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("quiz-images")
          .upload(filePath, q.mediaFile);

        if (uploadError) {
          setMessage(`第${i + 1}問のアップロードエラー: ${uploadError.message}`);
          return;
        }

        const { data } = supabase.storage
          .from("quiz-images")
          .getPublicUrl(filePath);

        uploadedMediaUrl = data.publicUrl;
      }

      const validChoices = q.choices.filter((choice) => choice.trim() !== "");

      questionRows.push({
        quiz_id: quizId,
        question: q.question,
        choices: q.questionType === "choice" ? validChoices : [],
        answer: q.answer,
        question_order: i + 1,
        question_type: q.questionType,
        media_url: q.questionType === "input" ? uploadedMediaUrl : null,
        media_type: q.questionType === "input" ? q.mediaType : null,
        clip_start:
          q.questionType === "input" && q.mediaType === "video" && q.clipStart
            ? Number(q.clipStart)
            : null,
        clip_end:
          q.questionType === "input" && q.mediaType === "video" && q.clipEnd
            ? Number(q.clipEnd)
            : null,
      });
    }

    const { error: questionError } = await supabase
      .from("questions")
      .insert(questionRows);

    if (questionError) {
      setMessage(`問題作成エラー: ${questionError.message}`);
      return;
    }

    setMessage("クイズを作成したよ！");

    setQuizId("");
    setTitle("");
    setDescription("");
    setQuestions([createEmptyQuestion()]);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-4 text-white md:p-8">
      <button
        onClick={() => router.push("/")}
        className="mb-6 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
      >
        ← ホームに戻る
      </button>

      <h1 className="mb-8 text-5xl font-black">
        🎮 クイズ作成スタジオ
      </h1>

      <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur md:p-8">
        <h2 className="mb-4 text-xl font-semibold">クイズ情報</h2>

        <label className="mb-2 block font-semibold">クイズID</label>
        <input
          value={quizId}
          onChange={(e) => setQuizId(e.target.value)}
          className="mb-4 w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-3 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
          placeholder="example: pokemon"
        />

        <label className="mb-2 block font-semibold">タイトル</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4 w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-3 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
          placeholder="ポケモンクイズ"
        />

        <label className="mb-2 block font-semibold">説明</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mb-6 w-full rounded border px-3 py-2"
          placeholder="ポケモンに関するクイズです。"
        />

        {questions.map((q, questionIndex) => (
          <div
            key={questionIndex}
            className="mb-8 rounded-[2rem] border border-white/10 bg-black/20 p-6 shadow-2xl backdrop-blur"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-3xl font-black text-cyan-300">第{questionIndex + 1}問</h2>

              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(questionIndex)}
                  className="rounded border px-3 py-1 text-sm"
                >
                  この問題を削除
                </button>
              )}
            </div>

            <label className="mb-2 block font-semibold">問題文</label>
            <input
              value={q.question}
              onChange={(e) =>
                updateQuestion(questionIndex, { question: e.target.value })
              }
              className="mb-4 w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-3 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
              placeholder="ピカチュウは何タイプ？"
            />

            <label className="mb-2 block font-semibold">問題タイプ</label>
            <select
              value={q.questionType}
              onChange={(e) => {
                const value = e.target.value as QuestionType;
                updateQuestion(questionIndex, {
                  questionType: value,
                  answer: "",
                  choices: ["", ""],
                  mediaFile: null,
                  previewUrl: "",
                  mediaType: "",
                  clipStart: "",
                  clipEnd: "",
                });
              }}
              className="mb-4 w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-3 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
            >
              <option value="choice">選択肢クイズ</option>
              <option value="input">入力クイズ</option>
            </select>

            {q.questionType === "input" && (
              <>
                <label className="mb-2 block font-semibold">
                  メディアタイプ
                </label>
                <select
                  value={q.mediaType}
                  onChange={(e) =>
                    updateQuestion(questionIndex, {
                      mediaType: e.target.value as MediaType,
                    })
                  }
                  className="mb-4 w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-3 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
                >
                  <option value="">選んでね</option>
                  <option value="image">画像</option>
                  <option value="video">動画</option>
                </select>

                {q.previewUrl && q.mediaType === "image" && (
                  <img
                    src={q.previewUrl}
                    alt="preview"
                    className="mb-4 max-h-60 rounded-xl object-contain"
                  />
                )}

                {q.previewUrl && q.mediaType === "video" && (
                  <video
                    src={q.previewUrl}
                    controls
                    className="mb-4 max-h-60 rounded-xl"
                  />
                )}

                {q.mediaType === "video" && (
                  <div className="mb-6 grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block font-semibold">開始秒</label>
                      <input
                        type="number"
                        value={q.clipStart}
                        onChange={(e) =>
                          updateQuestion(questionIndex, {
                            clipStart: e.target.value,
                          })
                        }
                        className="w-full rounded border px-3 py-2"
                        placeholder="2"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-semibold">終了秒</label>
                      <input
                        type="number"
                        value={q.clipEnd}
                        onChange={(e) =>
                          updateQuestion(questionIndex, {
                            clipEnd: e.target.value,
                          })
                        }
                        className="w-full rounded border px-3 py-2"
                        placeholder="5"
                      />
                    </div>
                  </div>
                )}

                <label className="mb-2 block font-semibold">メディア</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    let newMediaType: MediaType = "";

                    if (file.type.startsWith("image/")) {
                      newMediaType = "image";
                    }

                    if (file.type.startsWith("video/")) {
                      newMediaType = "video";
                    }

                    updateQuestion(questionIndex, {
                      mediaFile: file,
                      previewUrl: URL.createObjectURL(file),
                      mediaType: newMediaType,
                    });
                  }}
                  className="mb-4 w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-3 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
                />
              </>
            )}

            {q.questionType === "choice" && (
              <>
                <label className="mb-2 block font-semibold">選択肢</label>

                <div className="mb-4 space-y-2">
                  {q.choices.map((choice, choiceIndex) => (
                    <div key={choiceIndex} className="flex gap-2">
                      <input
                        value={choice}
                        onChange={(e) => {
                          const newChoices = [...q.choices];
                          const oldChoice = newChoices[choiceIndex];

                          newChoices[choiceIndex] = e.target.value;

                          updateQuestion(questionIndex, {
                            choices: newChoices,
                            answer: q.answer === oldChoice ? "" : q.answer,
                          });
                        }}
                        className="w-full rounded border px-3 py-2"
                        placeholder={`選択肢${choiceIndex + 1}`}
                      />

                      {q.choices.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const removedChoice = q.choices[choiceIndex];

                            updateQuestion(questionIndex, {
                              choices: q.choices.filter(
                                (_, i) => i !== choiceIndex
                              ),
                              answer:
                                q.answer === removedChoice ? "" : q.answer,
                            });
                          }}
                          className="rounded border px-3"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateQuestion(questionIndex, {
                      choices: [...q.choices, ""],
                    })
                  }
                  className="mb-6 rounded border px-4 py-2"
                >
                  選択肢を追加
                </button>

                <label className="mb-2 block font-semibold">正解</label>
                <select
                  value={q.answer}
                  onChange={(e) =>
                    updateQuestion(questionIndex, { answer: e.target.value })
                  }
                  className="mb-6 w-full rounded border px-3 py-2"
                >
                  <option value="">正解を選んでね</option>
                  {q.choices
                    .filter((choice) => choice.trim() !== "")
                    .map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                </select>
              </>
            )}

            {q.questionType === "input" && (
              <>
                <label className="mb-2 block font-semibold">正解</label>
                <input
                  value={q.answer}
                  onChange={(e) =>
                    updateQuestion(questionIndex, { answer: e.target.value })
                  }
                  className="mb-6 w-full rounded border px-3 py-2"
                  placeholder="クロバット"
                />
              </>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addQuestion}
          className="mb-6 mr-3 rounded-2xl bg-cyan-400 px-5 py-3 font-black text-gray-950 shadow-lg shadow-cyan-400/40"
        >
          問題を追加
        </button>

        <button
          onClick={handleCreateQuiz}
          className="rounded-2xl bg-pink-500 px-6 py-3 font-black text-white shadow-lg shadow-pink-500/40"
        >
          作成する
        </button>

        {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
      </div>
    </main>
  );
}