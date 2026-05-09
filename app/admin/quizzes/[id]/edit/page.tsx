"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRef } from "react";

export default function EditQuizPage() {
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timerSeconds, setTimerSeconds] = useState("");
  const [questionLimit, setQuestionLimit] = useState("");
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
  const videoRef = useRef<HTMLVideoElement | null>(null);


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
      setQuestionType(q.question_type);
    　setMediaType(q.media_type || "");
    　setMediaUrl(q.media_url || "");

      setQuestionId(q.id);
      setQuestion(q.question);
      setAnswer(q.answer);
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
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-6 text-3xl font-bold">クイズ編集</h1>

      <div className="max-w-2xl rounded-2xl bg-white p-6 shadow">
        <label className="mb-2 block font-semibold">タイトル</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4 w-full rounded border px-3 py-2"
        />

        <label className="mb-2 block font-semibold">説明</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mb-6 w-full rounded border px-3 py-2"
        />

        <label className="mb-2 block font-semibold">タイマー設定</label>
        <select
          value={timerSeconds}
          onChange={(e) => setTimerSeconds(e.target.value)}
          className="mb-4 w-full rounded border px-3 py-2"
        >
          <option value="">タイマーなし</option>
          <option value="3">3秒</option>
          <option value="5">5秒</option>
          <option value="10">10秒</option>
          <option value="30">30秒</option>
        </select>

        <label className="mb-2 block font-semibold">出題数</label>
        <select
          value={questionLimit}
          onChange={(e) => setQuestionLimit(e.target.value)}
          className="mb-6 w-full rounded border px-3 py-2"
        >
          <option value="">全部出題する</option>
          <option value="10">10問</option>
          <option value="20">20問</option>
          <option value="30">30問</option>
          <option value="50">50問</option>
        </select>

        <label className="mb-2 block font-semibold">問題文</label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="mb-4 w-full rounded border px-3 py-2"
        />

        {questionType === "input" && (
          <>
            <label className="mb-2 block font-semibold">現在のメディア</label>

            {/* 画像表示 */}
            {mediaType === "image" && mediaUrl && (
              <img
                src={previewUrl || mediaUrl}
                alt="quiz image"
                className="mb-4 max-h-60 rounded-xl object-contain"
              />
            )}

            {/* 動画表示 */}
            {mediaType === "video" && mediaUrl && (
              <video
                src={previewUrl || mediaUrl}
                controls
                className="mb-4 max-h-60 rounded-xl"
              />
            )}

            <label className="mb-2 block font-semibold">メディアを差し替える</label>
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
              className="mb-6 w-full rounded border px-3 py-2"
            />

            {/* 👇 動画のときだけ表示 */}
            {mediaType === "video" && (
              <>
                <label className="mb-2 block font-semibold">動画の範囲</label>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={clipStart}
                    onChange={(e) => setClipStart(e.target.value)}
                    placeholder="開始秒 (例: 2)"
                    className="rounded border px-3 py-2"
                  />

                  <input
                    type="number"
                    value={clipEnd}
                    onChange={(e) => setClipEnd(e.target.value)}
                    placeholder="終了秒 (例: 5)"
                    className="rounded border px-3 py-2"
                  />
                </div>
              </>
            )}
          </>
        )}

        <label className="mb-2 block font-semibold">正解</label>
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="mb-6 w-full rounded border px-3 py-2"
        />

        <button
          onClick={handleSave}
          className="rounded bg-black px-4 py-2 text-white"
        >
          保存する
        </button>

        {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
      </div>
    </main>
  );
}