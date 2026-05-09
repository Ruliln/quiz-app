import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-800 p-4 text-white md:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur md:p-12">
            <p className="mb-4 inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-black text-gray-950">
              REALTIME QUIZ BATTLE
            </p>

            <h1 className="mb-6 text-5xl font-black leading-tight md:text-7xl">
              Quiz App
              <span className="block text-cyan-300">みんなで遊ぼう</span>
            </h1>

            <p className="mb-8 max-w-xl text-lg font-bold text-white/75">
              PINで参加して、友達とリアルタイム対戦。画像・動画・入力問題にも対応したクイズゲーム！
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/room/create"
                className="rounded-2xl bg-pink-500 px-6 py-4 text-center text-lg font-black text-white shadow-lg shadow-pink-500/40 hover:bg-pink-400"
              >
                ルーム作成
              </Link>

              <Link
                href="/room/join"
                className="rounded-2xl bg-cyan-400 px-6 py-4 text-center text-lg font-black text-gray-950 shadow-lg shadow-cyan-400/30 hover:bg-cyan-300"
              >
                PINで参加
              </Link>

              <Link
                href="/quizzes"
                className="rounded-2xl bg-white/10 px-6 py-4 text-center text-lg font-black text-white hover:bg-white/20"
              >
                クイズ一覧
              </Link>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-gray-950/50 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-5 text-2xl font-black">できること</h2>

            <div className="space-y-4">
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-3xl">🎮</p>
                <h3 className="mt-2 text-xl font-black">みんなで対戦</h3>
                <p className="mt-1 text-sm text-white/65">
                  PINを共有して友達と同じルームで遊べる
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-3xl">⏱️</p>
                <h3 className="mt-2 text-xl font-black">タイマー設定</h3>
                <p className="mt-1 text-sm text-white/65">
                  待機室で制限時間と出題数を変更できる
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-3xl">🖼️</p>
                <h3 className="mt-2 text-xl font-black">画像・動画クイズ</h3>
                <p className="mt-1 text-sm text-white/65">
                  キャラ当てやイントロ風クイズも作れる
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}