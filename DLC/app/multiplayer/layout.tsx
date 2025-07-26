export const metadata = {
  title: '多人游戏 - 多智能体商业模拟器',
  description: '加入多人游戏模式，与其他玩家竞争建立商业帝国',
}

export default function MultiplayerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {children}
    </div>
  )
}
