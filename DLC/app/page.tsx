import { Button } from '@/components/ui/button';
import { ArrowRight, Trophy, Users, MessageCircle } from 'lucide-react';
import { siteConfig } from '@/lib/config';

export default function HomePage() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground tracking-tight sm:text-5xl md:text-6xl">
            Welcome to
            <span className="block text-primary">{siteConfig.name}</span>
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
            一款类似群星风格的2D商业竞争游戏，通过多智能体系统建立商业帝国，消灭竞争对手！
          </p>
          <div className="mt-8 flex flex-col gap-4 justify-center">
            <div className="flex gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="text-lg rounded-full px-8 py-3 bg-green-600 hover:bg-green-700"
              >
                <a href="/game-mode">
                  开始游戏
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                className="text-lg rounded-full px-8 py-3 bg-blue-600 hover:bg-blue-700"
              >
                <a href="/multiplayer">
                  <Users className="mr-2 h-5 w-5" />
                  多人游戏
                </a>
              </Button>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-lg rounded-full px-6 py-3 border-yellow-500/30 hover:border-yellow-400 text-yellow-600 hover:text-yellow-500"
              >
                <a href="/leaderboard">
                  <Trophy className="mr-2 h-5 w-5" />
                  排行榜
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}