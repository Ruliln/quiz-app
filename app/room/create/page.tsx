"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const quizzes = [
  { id: "anime", title: "アニメクイズ" },
  { id: "game", title: "ゲームクイズ" },
];

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function CreateRoomPage() {
  const router = useRouter();

  const [nickname, setNickname] = useState("");
  const [quizId, setQuizId] = useState("anime");
  const [createdPin, setCreatedPin] = useState("");
  const [message, setMessage] = useState("");

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
      })
      .select()
      .single();

    if (roomError || !room) {
      console.log("roomError", roomError);
        alert(`roomError: ${roomError?.message ?? "unknown error"}`);
        setMessage(`ルーム作成に失敗したよ: ${roomError?.message ?? "unknown error"}`);
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
      setMessage(`参加者登録に失敗したよ: ${playerError?.message ?? "unknown error"}`);
      return;
    }

    localStorage.setItem("myPlayerId", String(player.id));

    setCreatedPin(pin);
    setMessage("ルームを作成したよ！");
    router.push(`/room/${pin}`);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-6 text-3xl font-bold">ルーム作成</h1>

      <div className="max-w-xl rounded-2xl bg-white p-6 shadow">
        <label className="mb-2 block font-semibold">ニックネーム</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="mb-4 w-full rounded border px-3 py-2"
          placeholder="Name"
        />

        <label className="mb-2 block font-semibold">クイズを選ぶ</label>
        <select
          value={quizId}
          onChange={(e) => setQuizId(e.target.value)}
          className="mb-4 w-full rounded border px-3 py-2"
        >
          {quizzes.map((quiz) => (
            <option key={quiz.id} value={quiz.id}>
              {quiz.title}
            </option>
          ))}
        </select>

        <button
          onClick={handleCreateRoom}
          className="rounded bg-black px-4 py-2 text-white"
        >
          ルームを作成
        </button>

        {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}

        {createdPin && (
          <div className="mt-6 rounded-xl bg-gray-100 p-4">
            <p className="text-sm text-gray-600">このPINで参加できるよ</p>
            <p className="text-3xl font-bold tracking-widest">{createdPin}</p>
          </div>
        )}
      </div>
    </main>
  );
}