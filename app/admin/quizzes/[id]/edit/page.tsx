"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type QuestionType = "choice" | "input";
type MediaType = "image" | "video" | "";

type EditQuestion = {
  id: number;
  question: string;
  choices: string[];
  answer: string;
  questionType: QuestionType;
  mediaUrl: string | null;
  mediaType: MediaType;
  mediaFile: File | null;
  previewUrl: string;
  clipStart: string;
  clipEnd: string;
};

export default function EditQuizPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<EditQuestion[]>([]);
  const [message, setMessage] = useState("");

  function updateQuestion(index: number, newQuestion: Partial<EditQuestion>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...newQuestion } : q))
    );
  }

  useEffect(() => {
    async function fetchQuiz() {
      const supabase = createClient();

      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", id)
        .single();

      if (quizError || !quiz) {
        setMessage("クイズが見つかりません");
        return;
      }

      setTitle(quiz.title);
      setDescription(quiz.description);

      const { data: questionsData, error: questionError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", id)
        .order("question_order");

      if (questionError || !questionsData || questionsData.length === 0) {
        setMessage("問題が見つかりません");
        return;
      }

      setQuestions(
        questionsData.map((q) => ({
          id: q.id,
          question: q.question,
          choices: q.choices || ["", ""],
          answer: q.answer,
          questionType: q.question_type,
          mediaUrl: q.media_url,
          mediaType: q.media_type || "",
          mediaFile: null,
          previewUrl: "",
          clipStart: q.clip_start ? String(q.clip_start) : "",
          clipEnd: q.clip_end ? String(q.clip_end) : "",
        }))
      );
    }

    fetchQuiz();
  }, [id]);

  async function handleSave() {
    if (!title || !description) {
      setMessage("タイトルと説明を入力してね");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const validChoices = q.choices.filter((choice) => choice.trim() !== "");

      if (!q.question || !q.answer) {
        setMessage(`第${i + 1}問の問題文と正解を入力してね`);
        return;
      }

      if (q.questionType === "choice" && validChoices.length < 2) {
        setMessage(`第${i + 1}問の選択肢は2つ以上必要だよ`);
        return;
      }

      if (q.questionType === "choice" && !validChoices.includes(q.answer)) {
        setMessage(`第${i + 1}問の正解は選択肢の中から選んでね`);
        return;
      }
    }

    const supabase = createClient();

    const { error: quizError } = await supabase
      .from("quizzes")
      .update({
        title,
        description,
      })
      .eq("id", id);

    if (quizError) {
      setMessage(`クイズ更新エラー: ${quizError.message}`);
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      let updatedMediaUrl = q.mediaUrl;

      if (q.questionType === "input" && q.mediaFile) {
        const fileExt = q.mediaFile.name.split(".").pop();
        const fileName = `${Date.now()}-${i}.${fileExt}`;
        const filePath = `${id}/${fileName}`;

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

        updatedMediaUrl = data.publicUrl;
      }

      const validChoices = q.choices.filter((choice) => choice.trim() !== "");

      const { error: questionError } = await supabase
        .from("questions")
        .update({
          question: q.question,
          choices: q.questionType === "choice" ? validChoices : [],
          answer: q.answer,
          question_order: i + 1,
          question_type: q.questionType,
          media_url: q.questionType === "input" ? updatedMediaUrl : null,
          media_type: q.questionType === "input" ? q.mediaType : null,
          clip_start:
            q.questionType === "input" && q.mediaType === "video" && q.clipStart
              ? Number(q.clipStart)
              : null,
          clip_end:
            q.questionType === "input" && q.mediaType === "video" && q.clipEnd
              ? Number(q.clipEnd)
              : null,
        })
        .eq("id", q.id);

      if (questionError) {
        setMessage(`第${i + 1}問の更新エラー: ${questionError.message}`);
        return;
      }
    }

    setMessage("保存したよ！");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-4 text-white md:p-8">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.push("/admin")}
          className="mb-6 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
        >
          ← 管理へ戻る
        </button>

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
          <p className="mb-3 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-black text-gray-950">
            EDIT QUIZ
          </p>

          <h1 className="text-4xl font-black md:text-5xl">クイズ編集</h1>
          <p className="mt-3 font-bold text-white/80">
            複数の問題をまとめて編集できます。
          </p>
        </section>

        <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur md:p-8">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block font-black text-white">
                タイトル
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
              />
            </div>

            <div>
              <label className="mb-2 block font-black text-white">説明</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
              />
            </div>

            {questions.map((q, questionIndex) => (
              <div
                key={q.id}
                className="rounded-[2rem] border border-white/10 bg-black/20 p-6 shadow-2xl backdrop-blur"
              >
                <h2 className="mb-5 text-3xl font-black text-cyan-300">
                  第{questionIndex + 1}問
                </h2>

                <label className="mb-2 block font-black text-white">
                  問題文
                </label>
                <input
                  value={q.question}
                  onChange={(e) =>
                    updateQuestion(questionIndex, {
                      question: e.target.value,
                    })
                  }
                  className="mb-5 w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
                />

                <label className="mb-2 block font-black text-white">
                  問題タイプ
                </label>
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
                      mediaUrl: null,
                      clipStart: "",
                      clipEnd: "",
                    });
                  }}
                  className="mb-5 w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 font-bold text-white outline-none focus:ring-4 focus:ring-cyan-300/30"
                >
                  <option className="bg-white text-gray-950" value="choice">
                    選択肢クイズ
                  </option>
                  <option className="bg-white text-gray-950" value="input">
                    入力クイズ
                  </option>
                </select>

                {q.questionType === "choice" && (
                  <>
                    <label className="mb-2 block font-black text-white">
                      選択肢
                    </label>

                    <div className="mb-5 space-y-3">
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
                                answer:
                                  q.answer === oldChoice ? "" : q.answer,
                              });
                            }}
                            className="w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
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
                              className="rounded-2xl bg-red-500 px-4 font-black text-white"
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
                      className="mb-5 rounded-2xl bg-cyan-400 px-5 py-3 font-black text-gray-950 shadow-lg shadow-cyan-400/40"
                    >
                      選択肢を追加
                    </button>

                    <label className="mb-2 block font-black text-white">
                      正解
                    </label>
                    <select
                      value={q.answer}
                      onChange={(e) =>
                        updateQuestion(questionIndex, {
                          answer: e.target.value,
                        })
                      }
                      className="w-full rounded-2xl border border-pink-400 bg-white px-4 py-4 font-bold text-gray-950 outline-none shadow-lg shadow-pink-500/30 focus:ring-4 focus:ring-pink-300/30"
                    >
                      <option className="bg-white text-gray-950" value="">
                        正解を選んでね
                      </option>
                      {q.choices
                        .filter((choice) => choice.trim() !== "")
                        .map((choice) => (
                          <option
                            className="bg-white text-gray-950"
                            key={choice}
                            value={choice}
                          >
                            {choice}
                          </option>
                        ))}
                    </select>
                  </>
                )}

                {q.questionType === "input" && (
                  <>
                    <label className="mb-2 block font-black text-white">
                      メディアタイプ
                    </label>
                    <select
                      value={q.mediaType}
                      onChange={(e) =>
                        updateQuestion(questionIndex, {
                          mediaType: e.target.value as MediaType,
                        })
                      }
                      className="mb-5 w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 font-bold text-white outline-none focus:ring-4 focus:ring-cyan-300/30"
                    >
                      <option className="bg-white text-gray-950" value="">
                        選んでね
                      </option>
                      <option className="bg-white text-gray-950" value="image">
                        画像
                      </option>
                      <option className="bg-white text-gray-950" value="video">
                        動画
                      </option>
                    </select>

                    {(q.previewUrl || q.mediaUrl) && q.mediaType === "image" && (
                      <div className="mb-5 rounded-3xl bg-gray-950/50 p-4">
                        <img
                          src={q.previewUrl || q.mediaUrl || ""}
                          alt="quiz image"
                          className="mx-auto max-h-80 rounded-2xl object-contain"
                        />
                      </div>
                    )}

                    {(q.previewUrl || q.mediaUrl) && q.mediaType === "video" && (
                      <div className="mb-5 rounded-3xl bg-gray-950/50 p-4">
                        <video
                          src={q.previewUrl || q.mediaUrl || ""}
                          controls
                          className="mx-auto max-h-80 rounded-2xl"
                        />
                      </div>
                    )}

                    <label className="mb-2 block font-black text-white">
                      メディアを差し替える
                    </label>
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
                      className="mb-5 w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 font-bold text-white outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:font-black file:text-gray-950"
                    />

                    {q.mediaType === "video" && (
                      <div className="mb-5">
                        <label className="mb-2 block font-black text-white">
                          動画の範囲
                        </label>

                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            type="number"
                            value={q.clipStart}
                            onChange={(e) =>
                              updateQuestion(questionIndex, {
                                clipStart: e.target.value,
                              })
                            }
                            placeholder="開始秒 (例: 2)"
                            className="rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
                          />

                          <input
                            type="number"
                            value={q.clipEnd}
                            onChange={(e) =>
                              updateQuestion(questionIndex, {
                                clipEnd: e.target.value,
                              })
                            }
                            placeholder="終了秒 (例: 5)"
                            className="rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
                          />
                        </div>
                      </div>
                    )}

                    <label className="mb-2 block font-black text-white">
                      正解
                    </label>
                    <input
                      value={q.answer}
                      onChange={(e) =>
                        updateQuestion(questionIndex, {
                          answer: e.target.value,
                        })
                      }
                      className="w-full rounded-2xl border border-pink-400 bg-white px-4 py-4 font-bold text-gray-950 outline-none placeholder:text-gray-400 shadow-lg shadow-pink-500/30 focus:ring-4 focus:ring-pink-300/30"
                      placeholder="クロバット"
                    />
                  </>
                )}
              </div>
            ))}

            <button
              onClick={handleSave}
              className="rounded-2xl bg-pink-500 px-8 py-4 text-lg font-black text-white shadow-lg shadow-pink-500/40 hover:bg-pink-400"
            >
              保存する
            </button>

            {message && (
              <p className="rounded-2xl border border-white/10 bg-white/10 p-4 font-bold text-white/90">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}