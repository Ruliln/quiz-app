"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditQuizPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questionId, setQuestionId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");

  const [questionType, setQuestionType] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [clipStart, setClipStart] = useState("");
  const [clipEnd, setClipEnd] = useState("");

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

      const { data: questions, error: questionError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", id)
        .order("question_order")
        .limit(1);

      if (questionError || !questions || questions.length === 0) {
        setMessage("問題が見つかりません");
        return;
      }

      const q = questions[0];

      setQuestionId(q.id);
      setQuestion(q.question);
      setAnswer(q.answer);
      setQuestionType(q.question_type);
      setMediaType(q.media_type || "");
      setMediaUrl(q.media_url || "");
      setClipStart(q.clip_start ? String(q.clip_start) : "");
      setClipEnd(q.clip_end ? String(q.clip_end) : "");
    }

    fetchQuiz();
  }, [id]);

  async function handleSave() {
    if (!title || !description || !question || !answer || !questionId) {
      setMessage("全部入力してね");
      return;
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

    let updatedMediaUrl = mediaUrl;

    if (mediaFile) {
      const fileExt = mediaFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("quiz-images")
        .upload(filePath, mediaFile);

      if (uploadError) {
        setMessage(`アップロードエラー: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage
        .from("quiz-images")
        .getPublicUrl(filePath);

      updatedMediaUrl = data.publicUrl;
    }

    const { error: questionError } = await supabase
      .from("questions")
      .update({
        question,
        answer,
        media_url: questionType === "input" ? updatedMediaUrl : null,
        media_type: questionType === "input" ? mediaType : null,
        clip_start:
          questionType === "input" && mediaType === "video" && clipStart
            ? Number(clipStart)
            : null,
        clip_end:
          questionType === "input" && mediaType === "video" && clipEnd
            ? Number(clipEnd)
            : null,
      })
      .eq("id", questionId);

    if (questionError) {
      setMessage(`問題更新エラー: ${questionError.message}`);
      return;
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
            タイトル・説明・第1問の内容を編集できます。
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

            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6">
              <h2 className="mb-5 text-3xl font-black text-cyan-300">
                第1問
              </h2>

              <label className="mb-2 block font-black text-white">問題文</label>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="mb-5 w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
              />

              {questionType === "input" && (
                <>
                  <label className="mb-2 block font-black text-white">
                    現在のメディア
                  </label>

                  {mediaType === "image" && mediaUrl && (
                    <div className="mb-5 rounded-3xl bg-gray-950/50 p-4">
                      <img
                        src={previewUrl || mediaUrl}
                        alt="quiz image"
                        className="mx-auto max-h-80 rounded-2xl object-contain"
                      />
                    </div>
                  )}

                  {mediaType === "video" && mediaUrl && (
                    <div className="mb-5 rounded-3xl bg-gray-950/50 p-4">
                      <video
                        src={previewUrl || mediaUrl}
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

                      setMediaFile(file);
                      setPreviewUrl(URL.createObjectURL(file));

                      if (file.type.startsWith("image/")) {
                        setMediaType("image");
                      }

                      if (file.type.startsWith("video/")) {
                        setMediaType("video");
                      }
                    }}
                    className="mb-5 w-full rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 font-bold text-white outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:font-black file:text-gray-950"
                  />

                  {mediaType === "video" && (
                    <div className="mb-5">
                      <label className="mb-2 block font-black text-white">
                        動画の範囲
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          type="number"
                          value={clipStart}
                          onChange={(e) => setClipStart(e.target.value)}
                          placeholder="開始秒 (例: 2)"
                          className="rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
                        />

                        <input
                          type="number"
                          value={clipEnd}
                          onChange={(e) => setClipEnd(e.target.value)}
                          placeholder="終了秒 (例: 5)"
                          className="rounded-2xl border border-cyan-300 bg-white/5 px-4 py-4 font-bold text-white outline-none placeholder:text-white/40 focus:ring-4 focus:ring-cyan-300/30"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <label className="mb-2 block font-black text-white">正解</label>
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full rounded-2xl border border-pink-400 bg-white px-4 py-4 font-bold text-gray-950 outline-none placeholder:text-gray-400 shadow-lg shadow-pink-500/30 focus:ring-4 focus:ring-pink-300/30"
              />
            </div>

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