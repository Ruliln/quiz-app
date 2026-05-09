"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Player = {
  id: number;
  nickname: string;
  score: number;
};

type RoomSetting = {
  timer_seconds: number | null;
  question_limit: number | null;
};

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const pin = params.pin as string;

  const [players, setPlayers] = useState<Player[]>([]);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [status, setStatus] = useState("waiting");

  const [roomSetting, setRoomSetting] = useState<RoomSetting>({
    timer_seconds: null,
    question_limit: null,
  });

  const supabase = createClient();

  const [questions, setQuestions] = useState<any[]>([]);
  const playableQuestions = roomSetting.question_limit
    ? questions.slice(0, Math.min(roomSetting.question_limit, questions.length))
    : questions;

  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState("");

  const [myPlayerId, setMyPlayerId] = useState<number | null>(null);
  const [hostPlayerId, setHostPlayerId] = useState<number | null>(null);
  const isHost = myPlayerId !== null && hostPlayerId === myPlayerId;

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  async function copyInviteUrl() {
    const inviteUrl = `${window.location.origin}/room/join?pin=${pin}`;

    await navigator.clipboard.writeText(inviteUrl);
    alert("招待URLをコピーしたよ！");
  }

  useEffect(() => {
    const id = localStorage.getItem("myPlayerId");
    if (id) {
      setMyPlayerId(Number(id));
    }
  }, []);

  useEffect(() => {
    if (!roomSetting.timer_seconds) {
      setTimeLeft(null);
      return;
    }

    setTimeLeft(roomSetting.timer_seconds);
  }, [currentIndex, roomSetting.timer_seconds]);

  useEffect(() => {
    if (status !== "playing") return;
    if (isCorrect !== null) return;
    if (!roomSetting.timer_seconds) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;

        if (prev <= 1) {
          setSelected("timeout");
          setIsCorrect(false);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, currentIndex, isCorrect, roomSetting.timer_seconds]);

  useEffect(() => {
    setSelected(null);
    setIsCorrect(null);
    setTypedAnswer("");
  }, [currentIndex]);

  async function updateRoomSetting(
    key: "timer_seconds" | "question_limit",
    value: string
  ) {
    if (!roomId) return;
    if (!isHost) return;

    const newValue = value ? Number(value) : null;

    const { error } = await supabase
      .from("rooms")
      .update({ [key]: newValue })
      .eq("id", roomId);

    if (error) {
      console.log("ルール変更エラー", error);
      return;
    }

    setRoomSetting((prev) => ({
      ...prev,
      [key]: newValue,
    }));
  }

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

  async function handleNextQuestion() {
    if (!roomId) return;

    const nextIndex = currentIndex + 1;

    if (nextIndex >= playableQuestions.length) {
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

  async function addScoreIfCorrect(correct: boolean) {
    if (!correct || !myPlayerId) return;

    const player = players.find((p) => p.id === myPlayerId);
    if (!player) return;

    await supabase
      .from("room_players")
      .update({ score: player.score + 1 })
      .eq("id", myPlayerId);
  }

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
      setHostPlayerId(room.host_player_id);
      setRoomSetting({
        timer_seconds: room.timer_seconds,
        question_limit: room.question_limit,
      });

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
        (payload) => {
          setStatus(payload.new.status);
          setCurrentIndex(payload.new.current_question_index);
          setRoomSetting({
            timer_seconds: payload.new.timer_seconds,
            question_limit: payload.new.question_limit,
          });
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
      <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-6 text-white">
        <button
          onClick={() => router.push("/")}
          className="mb-6 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          ← ホーム
        </button>

        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
          <h1 className="mb-2 text-center text-4xl font-black">結果発表 🎉</h1>
          <p className="mb-8 text-center text-white/70">みんなおつかれさま！</p>

          <ul className="space-y-3">
            {players
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((p, index) => {
                const medal =
                  index === 0
                    ? "🥇"
                    : index === 1
                      ? "🥈"
                      : index === 2
                        ? "🥉"
                        : "🏅";

                return (
                  <li
                    key={p.id}
                    className={`flex items-center justify-between rounded-2xl px-5 py-4 text-lg ${
                      index === 0
                        ? "bg-yellow-300 text-gray-950"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    <span className="font-bold">
                      {medal} {p.nickname}
                      {p.id === myPlayerId && " ← あなた"}
                    </span>
                    <span className="text-2xl font-black">{p.score}点</span>
                  </li>
                );
              })}
          </ul>
        </div>
      </main>
    );
  }

  if (status === "playing") {
    const q = playableQuestions[currentIndex];

    if (!q) {
      return (
        <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-8 text-white">
          読み込み中...
        </main>
      );
    }

    const choiceStyles = [
      "border-pink-400 shadow-pink-500/40",
      "border-cyan-400 shadow-cyan-400/40",
      "border-yellow-300 shadow-yellow-300/40",
      "border-green-400 shadow-green-400/40",
    ];

    const choiceBadgeStyles = [
      "bg-pink-500",
      "bg-cyan-400",
      "bg-yellow-400",
      "bg-green-400",
    ];

    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-4 text-white md:p-8">
        <div className="mx-auto max-w-7xl">
          <button
            onClick={() => router.push("/")}
            className="mb-6 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            ← ホーム
          </button>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur md:p-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-cyan-300">
                    第{currentIndex + 1}問 / 全{playableQuestions.length}問
                  </p>
                  <h1 className="mt-1 text-2xl font-black md:text-4xl">
                    クイズ開始！🎮
                  </h1>
                </div>

                {timeLeft !== null && (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pink-500 text-3xl font-black shadow-lg shadow-pink-500/40">
                    {timeLeft}
                  </div>
                )}
              </div>

              {(q.media_type === "image" || q.media_type === "video") &&
                q.media_url && (
                  <div className="mb-6 overflow-hidden rounded-3xl bg-black/30 p-3">
                    {q.media_type === "image" && (
                      <img
                        src={q.media_url}
                        alt="quiz image"
                        className="mx-auto max-h-[420px] rounded-2xl object-contain"
                      />
                    )}

                    {q.media_type === "video" && (
                      <video
                        src={q.media_url}
                        controls
                        className="mx-auto max-h-[420px] rounded-2xl"
                      />
                    )}
                  </div>
                )}

              <div className="mb-6 rounded-3xl bg-gray-950/60 p-6 text-center">
                <h2 className="text-2xl font-black leading-relaxed md:text-3xl">
                  {q.question}
                </h2>
              </div>

              {q.question_type === "choice" && (
                <div className="grid gap-4 md:grid-cols-2">
                  {q.choices.map((choice: string, index: number) => {
                    const correct = choice === q.answer;
                    const isSelected = selected === choice;

                    return (
                      <button
                        key={choice}
                        disabled={selected !== null}
                        onClick={async () => {
                          if (selected) return;

                          setSelected(choice);
                          setIsCorrect(correct);
                          await addScoreIfCorrect(correct);
                        }}
                        className={`min-h-24 rounded-3xl bg-gradient-to-br px-5 py-5 text-left text-xl font-black shadow-xl transition hover:scale-[1.02] disabled:cursor-not-allowed ${
                          choiceStyles[index % choiceStyles.length]
                        } ${
                          selected !== null && !isSelected
                            ? "opacity-40"
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
                            choiceBadgeStyles[index % choiceBadgeStyles.length]
                          }`}
                        >
                          {index + 1}
                        </span>
                        {choice}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.question_type === "input" && (
                <div className="rounded-3xl bg-white/10 p-4">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <input
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      disabled={selected !== null}
                      className="flex-1 rounded-2xl border-2 border-pink-400 bg-white px-4 py-4 text-lg font-bold text-gray-950 outline-none placeholder:text-gray-400 shadow-lg shadow-pink-500/30 focus:ring-4 focus:ring-pink-300/30"
                      placeholder="答えを入力"
                    />

                    <button
                      disabled={selected !== null}
                      onClick={async () => {
                        if (selected) return;

                        const correct =
                          typedAnswer.trim().toLowerCase() ===
                          q.answer.trim().toLowerCase();

                        setSelected("input");
                        setIsCorrect(correct);
                        await addScoreIfCorrect(correct);
                      }}
                      className="rounded-2xl bg-pink-500 px-8 py-4 text-lg font-black text-white shadow-lg shadow-pink-500/40 disabled:opacity-50"
                    >
                      回答
                    </button>
                  </div>
                </div>
              )}

              {isCorrect !== null && (
                <div className="mt-6 rounded-3xl bg-white p-5 text-center text-gray-950">
                  <p className="text-2xl font-black">
                    {selected === "timeout"
                      ? "時間切れ！⏰"
                      : isCorrect
                        ? "正解！🎉"
                        : "不正解…😢"}
                  </p>

                  {!isCorrect && selected !== "timeout" && (
                    <p className="mt-2 font-bold text-gray-600">
                      正解は「{q.answer}」だよ！
                    </p>
                  )}

                  {selected === "timeout" && (
                    <p className="mt-2 font-bold text-gray-600">
                      正解は「{q.answer}」だよ！
                    </p>
                  )}

                  {isHost ? (
                    <button
                      onClick={handleNextQuestion}
                      className="mt-4 rounded-2xl bg-gray-950 px-8 py-3 font-black text-white"
                    >
                      {currentIndex + 1 >= playableQuestions.length
                        ? "結果を見る"
                        : "次へ"}
                    </button>
                  ) : (
                    <p className="mt-4 text-sm font-bold text-gray-500">
                      ホストが次の問題へ進めるまで待ってね
                    </p>
                  )}
                </div>
              )}
            </section>

            <aside className="rounded-[2rem] border border-white/10 bg-gray-950/50 p-5 shadow-2xl backdrop-blur">
              <h2 className="mb-4 text-xl font-black">スコアボード</h2>

              <ul className="space-y-3">
                {players
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((p, index) => (
                    <li
                      key={p.id}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                        p.id === myPlayerId
                          ? "bg-cyan-400 text-gray-950"
                          : "bg-white/10"
                      }`}
                    >
                      <span className="font-bold">
                        {index + 1}. {p.nickname}
                      </span>
                      <span className="text-xl font-black">{p.score}</span>
                    </li>
                  ))}
              </ul>
            </aside>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-4 text-white md:p-8">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.push("/")}
          className="mb-6 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          ← ホーム
        </button>

        <div className="rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
          <div className="mb-8 text-center">
            <p className="mb-2 text-sm font-bold text-cyan-300">WAITING ROOM</p>
            <h1 className="text-4xl font-black">待機室</h1>
            <p className="mt-3 text-white/70">みんなが集まったら開始しよう！</p>
          </div>

          <div className="mx-auto mb-8 max-w-sm rounded-3xl bg-gray-950/60 p-6 text-center">
            <p className="text-sm text-white/60">ルームPIN</p>
            <p className="text-5xl font-black tracking-widest">{pin}</p>
          </div>

          <button
            onClick={copyInviteUrl}
            className="mt-4 rounded-2xl bg-cyan-400 px-5 py-3 font-black text-gray-950 shadow-lg shadow-cyan-400/40 hover:bg-cyan-300"
          >
            🔗 招待URLをコピー
          </button>

          <div className="grid gap-6 md:grid-cols-[1fr_280px]">
            <div className="rounded-3xl bg-white p-5 text-gray-950">
              <h2 className="mb-4 text-xl font-black">参加者</h2>

              <ul className="space-y-2">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-2xl bg-gray-100 px-4 py-3 font-bold"
                  >
                    <span>{p.nickname}</span>
                    {p.id === hostPlayerId && (
                      <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs">
                        HOST
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl bg-gray-950/60 p-5">
              <h2 className="mb-4 text-xl font-black">ルール設定</h2>

              <div className="space-y-4 text-sm">
              <div className="rounded-2xl bg-white/10 p-4">
                <label className="mb-2 block text-white/60">出題数</label>

                {isHost ? (
                  <select
                    value={roomSetting.question_limit ?? ""}
                    onChange={(e) =>
                      updateRoomSetting("question_limit", e.target.value)
                    }
                    className="w-full rounded-xl border border-white/20 bg-white px-3 py-3 font-bold text-gray-950"
                  >
                    <option value="">全部</option>
                    <option value="10">10問</option>
                    <option value="20">20問</option>
                    <option value="30">30問</option>
                    <option value="50">50問</option>
                  </select>
                ) : (
                  <p className="text-xl font-black">
                    {roomSetting.question_limit
                      ? `${roomSetting.question_limit}問`
                      : "全部"}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <label className="mb-2 block text-white/60">制限時間</label>

                {isHost ? (
                  <select
                    value={roomSetting.timer_seconds ?? ""}
                    onChange={(e) =>
                      updateRoomSetting("timer_seconds", e.target.value)
                    }
                    className="w-full rounded-xl border border-white/20 bg-white px-3 py-3 font-bold text-gray-950"
                  >
                    <option value="">なし</option>
                    <option value="3">3秒</option>
                    <option value="5">5秒</option>
                    <option value="10">10秒</option>
                    <option value="30">30秒</option>
                  </select>
                ) : (
                  <p className="text-xl font-black">
                    {roomSetting.timer_seconds
                      ? `${roomSetting.timer_seconds}秒`
                      : "なし"}
                  </p>
                )}
              </div>
            </div>

              {status === "waiting" && isHost && (
                <button
                  onClick={handleStart}
                  className="mt-6 w-full rounded-2xl bg-pink-500 px-4 py-4 text-lg font-black text-white shadow-lg shadow-pink-500/40 hover:bg-pink-400"
                >
                  ゲーム開始
                </button>
              )}

              {status === "waiting" && !isHost && (
                <p className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-white/70">
                  ホストがゲームを開始するまで待ってね
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}