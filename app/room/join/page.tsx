"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

export default function JoinRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pin, setPin] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");

  //PIN自動入力
  useEffect(() => {
    const pinParam = searchParams.get("pin");

    if (pinParam) {
      setPin(pinParam);
    }
  }, [searchParams]);

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
      setMessage(
        `参加者登録に失敗したよ: ${
          playerError?.message ?? "unknown error"
        }`
      );
      return;
    }

    localStorage.setItem("myPlayerId", String(player.id));

    setMessage(`参加できたよ！ ルームPIN: ${pin}`);

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
            <p className="mb-3 inline-flex rounded-full bg-pink-500 px-4 py-2 text-sm font-black text-white">
              JOIN ROOM
            </p>

            <h1 className="mb-3 text-4xl font-black md:text-5xl">
              PINで参加
            </h1>

            <p className="mb-8 text-white/70">
              友達から送られたPINコードを入力して参加しよう！
            </p>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-black text-white/80">
                  PINコード
                </label>

                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-white px-4 py-4 text-center text-3xl font-black tracking-[0.3em] text-gray-950 outline-none focus:ring-4 focus:ring-pink-300/40"
                  placeholder="123456"
                  maxLength={6}
                />
              </div>

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

              <button
                onClick={handleJoinRoom}
                className="w-full rounded-2xl bg-cyan-400 px-6 py-4 text-lg font-black text-gray-950 shadow-lg shadow-cyan-400/30 hover:bg-cyan-300"
              >
                ルームに参加
              </button>

              {message && (
                <p className="rounded-2xl bg-white/10 p-4 text-sm font-bold text-white/80">
                  {message}
                </p>
              )}
            </div>
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-gray-950/50 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-5 text-2xl font-black">参加方法</h2>

            <div className="space-y-4">
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-3xl">🎫</p>
                <h3 className="mt-2 text-xl font-black">PINを入力</h3>
                <p className="mt-1 text-sm text-white/65">
                  ホストから送られた6桁のPINコードを入力
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-3xl">👤</p>
                <h3 className="mt-2 text-xl font-black">名前を決める</h3>
                <p className="mt-1 text-sm text-white/65">
                  ランキングに表示される名前を入力
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-3xl">⚡</p>
                <h3 className="mt-2 text-xl font-black">すぐ対戦開始</h3>
                <p className="mt-1 text-sm text-white/65">
                  待機室に入ってゲーム開始を待とう
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-pink-500 p-5 text-white">
              <p className="text-sm font-black">TIP</p>
              <p className="mt-2 text-lg font-black">
                スマホでも参加できるよ 📱
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}