import { Button } from '@/components/ui/button';
import { ArrowRight, Brain, Building2, Users } from 'lucide-react';
import { siteConfig } from '@/lib/config';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground tracking-tight sm:text-5xl md:text-6xl">
            <span className="block text-primary">{siteConfig.name}</span>
          </h1>
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
            {siteConfig.description}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="text-lg rounded-full px-8 py-3"
            >
              <Link href="/simulation">
                进入模拟系统
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg rounded-full px-8 py-3"
            >
              <Link href="/sign-up">
                注册账户
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              核心功能特性
            </h2>
            <p className="text-xl text-muted-foreground">
              体验真实的AI商业决策与竞争模拟
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">双重公司体系</h3>
              <p className="text-muted-foreground">
                支持集权制(CEO-经理-员工)和去中心化(扁平协作)两种公司架构，体验不同的决策机制
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI智能决策</h3>
              <p className="text-muted-foreground">
                集成多种AI模型(OpenAI、Claude等)，每个AI员工都具有独特的决策风格和个性特征
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">实时互动模拟</h3>
              <p className="text-muted-foreground">
                WebSocket实时通信，观察AI公司的每一个决策过程，体验商战的激烈竞争
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}