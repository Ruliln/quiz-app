"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type Quiz = {
  id: string;
  title: string;
};

export default function CreateRoomPage() {
  const router = useRouter();

  const [nickname, setNickname] = useState("");
  const [quizId, setQuizId] = useState("anime");
  const [createdPin, setCreatedPin] = useState("");
  const [message, setMessage] = useState("");

  const searchParams = useSearchParams();
  const quizIdParam = searchParams.get("quizId");

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    if (quizIdParam) {
      setQuizId(quizIdParam);
    }
  }, [quizIdParam]);

  useEffect(() => {
    async function fetchQuizzes() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title")
        .order("title");

      if (error) {
        console.log("クイズ取得エラー", error);
        return;
      }

      setQuizzes(data || []);

      if (data && data.length > 0 && !quizIdParam) {
        setQuizId(data[0].id);
      }
    }

    fetchQuizzes();
  }, [quizIdParam]);

  async function handleCreateRoom() {
    if (!nickname.trim()) {
      setMessage("ニックネームを入れてね");
      return;
    }

    const supabase = createClient();
    const pin = generatePin();

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        pin,
        quiz_id: quizId,
        status: "waiting",
        timer_seconds: null,
        question_limit: null,
      })
      .select()
      .single();

    if (roomError || !room) {
      console.log("roomError", roomError);
      setMessage(
        `ルーム作成に失敗したよ: ${
          roomError?.message ?? "unknown error"
        }`
      );
      return;
    }

    const { data: player, error: playerError } = await supabase
      .from("room_players")
      .insert({
        room_id: room.id,
        nickname,
        score: 0,
      })
      .select()
      .single();

    if (playerError || !player) {
      setMessage(
        `参加者登録に失敗したよ: ${
          playerError?.message ?? "unknown error"
        }`
      );
      return;
    }

    await supabase
      .from("rooms")
      .update({ host_player_id: player.id })
      .eq("id", room.id);

    localStorage.setItem("myPlayerId", String(player.id));

    setCreatedPin(pin);
    setMessage("ルームを作成したよ！");
    router.push(`/room/${pin}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-4 text-white md:p-8">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.push("/")}
          className="mb-6 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
        >
          ← ホーム
        </button>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
            <p className="mb-3 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-black text-gray-950">
              CREATE ROOM
            </p>

            <h1 className="mb-3 text-4xl font-black md:text-5xl">
              ルーム作成
            </h1>

            <p className="mb-8 text-white/70">
              クイズを選んで、友達と遊ぶルームを作ろう！
            </p>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-black text-white/80">
                  ニックネーム
                </label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-white px-4 py-4 text-lg font-bold text-gray-950 outline-none focus:ring-4 focus:ring-cyan-300/40"
                  placeholder="Name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-white/80">
                  クイズを選ぶ
                </label>
                <select
                  value={quizId}
                  onChange={(e) => setQuizId(e.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-white px-4 py-4 text-lg font-bold text-gray-950 outline-none focus:ring-4 focus:ring-cyan-300/40"
                >
                  {quizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCreateRoom}
                className="w-full rounded-2xl bg-pink-500 px-6 py-4 text-lg font-black text-white shadow-lg shadow-pink-500/40 hover:bg-pink-400"
              >
                ルームを作成
              </button>

              {message && (
                <p className="rounded-2xl bg-white/10 p-4 text-sm font-bold text-white/80">
                  {message}
                </p>
              )}
            </div>
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-gray-950/50 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-5 text-2xl font-black">作成後の流れ</h2>

            <div className="space-y-4">
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-3xl">1️⃣</p>
                <h3 className="mt-2 text-xl font-black">PINを共有</h3>
                <p className="mt-1 text-sm text-white/65">
                  待機室で表示されるPINを友達に送ろう
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-3xl">2️⃣</p>
                <h3 className="mt-2 text-xl font-black">ルール調整</h3>
                <p className="mt-1 text-sm text-white/65">
                  待機室で出題数と制限時間を決められる
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-3xl">3️⃣</p>
                <h3 className="mt-2 text-xl font-black">ゲーム開始</h3>
                <p className="mt-1 text-sm text-white/65">
                  ホストだけがゲームを開始できるよ
                </p>
              </div>
            </div>

            {createdPin && (
              <div className="mt-6 rounded-3xl bg-cyan-400 p-5 text-gray-950">
                <p className="text-sm font-black">このPINで参加できるよ</p>
                <p className="text-4xl font-black tracking-widest">
                  {createdPin}
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}