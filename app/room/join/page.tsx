"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function JoinRoomPage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");

  async function handleJoinRoom() {
    if (!pin.trim() || !nickname.trim()) {
      setMessage("PINとニックネームを入れてね");
      return;
    }

    const supabase = createClient();

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("pin", pin)
      .single();

    if (roomError || !room) {
      setMessage("ルームが見つからないよ");
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

    setMessage(`参加できたよ！ ルームPIN: ${pin}`);

    router.push(`/room/${pin}`);
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-6 text-3xl font-bold">PINで参加</h1>

      <div className="max-w-xl rounded-2xl bg-white p-6 shadow">
        <label className="mb-2 block font-semibold">PINコード</label>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="mb-4 w-full rounded border px-3 py-2"
          placeholder="123456"
        />

        <label className="mb-2 block font-semibold">ニックネーム</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="mb-4 w-full rounded border px-3 py-2"
          placeholder="Name"
        />

        <button
          onClick={handleJoinRoom}
          className="rounded bg-black px-4 py-2 text-white"
        >
          参加する
        </button>

        {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
      </div>
    </main>
  );
}