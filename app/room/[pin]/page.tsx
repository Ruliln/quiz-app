"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Player = {
  id: number;
  nickname: string;
  score: number;
};

export default function RoomPage() {
  const params = useParams();
  const pin = params.pin as string;

  const [players, setPlayers] = useState<Player[]>([]);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [status, setStatus] = useState("waiting");

  const supabase = createClient();

  //問題をDBから取る
  const [questions, setQuestions] = useState<any[]>([]);

  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  //RoomPageでIDを読む
  const [myPlayerId, setMyPlayerId] = useState<number | null>(null);
  useEffect(() => {
    const id = localStorage.getItem("myPlayerId");
    if (id) {
      setMyPlayerId(Number(id));
    }
  }, []);

  const [timeLeft, setTimeLeft] = useState(10);
  //問題が変わったら10秒に戻す
  useEffect(() => {
  setTimeLeft(10);
  }, [currentIndex]);
  //カウントダウン追加
  useEffect(() => {
    if (status !== "playing") return;
    if (isCorrect !== null) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setSelected("timeout");
          setIsCorrect(false);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, currentIndex, isCorrect]);

  useEffect(() => {
    setSelected(null);
    setIsCorrect(null);
  }, [currentIndex]);

  async function handleStart() {
  if (!roomId) return;

  const { error } = await supabase
    .from("rooms")
    .update({ status: "playing" })
    .eq("id", roomId);

  if (error) {
    console.log("開始失敗", error);
  }
  }

  //次へボタン用の関数を追加
  async function handleNextQuestion() {
  if (!roomId) return;

  const nextIndex = currentIndex + 1;

  if (nextIndex >= questions.length) {
    await supabase
      .from("rooms")
      .update({ status: "finished" })
      .eq("id", roomId);
    return;
  }

  setSelected(null);
  setIsCorrect(null);

  await supabase
    .from("rooms")
    .update({ current_question_index: nextIndex })
    .eq("id", roomId);
  }

  //ルーム取得, データを取る場所
  useEffect(() => {
    async function fetchRoom() {
      const { data: room } = await supabase
        .from("rooms")
        .select("*")
        .eq("pin", pin)
        .single();

      if (!room) return;

      setRoomId(room.id);
      setStatus(room.status);
      setCurrentIndex(room.current_question_index);

      const { data: players } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", room.id);

      setPlayers(players || []);

      const { data: questionData } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", room.quiz_id)
      .order("question_order");

      setQuestions(questionData || []);

    }

    fetchRoom();
  }, [pin]);

  // リアルタイム更新🔥
  useEffect(() => {
  if (!roomId) return;

  const playerChannel = supabase
    .channel(`room_players_${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "room_players",
        filter: `room_id=eq.${roomId}`,
      },
      async () => {
        const { data } = await supabase
          .from("room_players")
          .select("*")
          .eq("room_id", roomId);

        setPlayers(data || []);
      }
    )
    .subscribe();

  const roomChannel = supabase
    .channel(`room_status_${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomId}`,
      },
      //Realtime受信（他人の変更）用
      (payload) => {
        setStatus(payload.new.status);
        setCurrentIndex(payload.new.current_question_index);
      }
    )
      .subscribe();

    return () => {
      supabase.removeChannel(playerChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [roomId]);

  if (status === "finished") {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <h1 className="mb-6 text-3xl font-bold">結果発表 🎉</h1>

        <div className="rounded-2xl bg-white p-6 shadow">
          <ul className="space-y-2">
            {players
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((p, index) => {
                const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";

                return (
                  <li
                    key={p.id}
                    className={`flex justify-between rounded px-4 py-3 ${
                      index === 0 ? "bg-yellow-200" : "bg-gray-100"
                    }`}
                  >
                    <span>
                      {medal} {p.nickname}
                    </span>
                    {p.id === myPlayerId && " ← あなた"}
                    <span className="text-xl font-bold">{p.score}点</span>
                  </li>
                );
              })
            }
          </ul>
        </div>
      </main>
    );
  }

  if (status === "playing") {
  const q = questions[currentIndex];

  if (!q) return <div>読み込み中...</div>;

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-4 text-3xl font-bold">クイズ開始！🎮</h1>

      <div className="rounded-2xl bg-white p-6 shadow">
        <p className="mb-2 text-sm text-gray-500">第{currentIndex + 1}問</p>

      <p className="mb-4 text-lg font-bold">
        残り時間: {timeLeft}秒
      </p>

        <h2 className="mb-6 text-2xl font-semibold">
          {q.question}
        </h2>

        <div className="grid gap-3">
          {q.choices.map((choice: string) => (
            <button
              key={choice}
              disabled={selected !== null}
              onClick={async () => {
                if (selected) return;

                setSelected(choice);

                const correct = choice === q.answer;
                setIsCorrect(correct);

                const player = players.find((p) => p.id === myPlayerId);

                if (correct && myPlayerId && player) {
                  await supabase
                    .from("room_players")
                    .update({ score: player.score + 1 })
                    .eq("id", myPlayerId);
                }
              }}
              className={`rounded-lg border px-4 py-3 text-left ${
                selected === choice
                  ? choice === q.answer
                  ? "bg-green-200"
                  : "bg-red-200"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
        {isCorrect !== null && (
          <p className="mt-4 text-lg font-bold">
            {selected === "timeout"
              ? "時間切れ！⏰"
              : isCorrect
                ? "正解！🎉"
                : "不正解…😢"
            }
          </p>
        )}
        {isCorrect !== null && (
        <button
          onClick={handleNextQuestion}
          className="mt-4 rounded bg-black px-4 py-2 text-white"
        >
        {currentIndex + 1 >= questions.length ? "結果を見る" : "次へ"}
        </button>
        )}
        <ul>
        {players.map((p) => (
          <li key={p.id}>
          {p.nickname}：{p.score}
          </li>
        ))}
        </ul>
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-2 text-3xl font-bold">待機室</h1>
      <p className="mb-6 text-gray-600">ルームPIN: {pin}</p>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">参加者</h2>

        <ul className="space-y-2">
          {players.map((p) => (
            <li
              key={p.id}
              className="rounded bg-gray-100 px-3 py-2"
            >
              {p.nickname}
            </li>
          ))}
        </ul>
        
        {status === "waiting" && (
          <button
            onClick={handleStart}
            className="mt-4 rounded bg-black px-4 py-2 text-white"
          >
            ゲーム開始
          </button>
        )}
      </div>
    </main>
  );
}