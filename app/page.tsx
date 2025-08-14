import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Play, UserPlus, Sparkles } from "lucide-react"

export default async function Home() {
  // If Supabase is not configured, show setup message
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Check if user is already logged in
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-lg w-full">
        {/* Hero Section */}
        <div className="space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <h1 className="relative text-6xl md:text-7xl font-bold text-white tracking-tight">Tic Tac Toe</h1>
          </div>
          <p className="text-xl md:text-2xl text-slate-300 leading-relaxed">
            Challenge AI with multiple difficulty levels or play with friends in real-time multiplayer rooms
          </p>
          <div className="flex items-center justify-center space-x-2 text-slate-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">Track stats • Climb leaderboards • Have fun</span>
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10">
            <CardContent className="p-6">
              <Link href="/auth/login" className="block">
                <div className="space-y-4">
                  <div className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Login</h3>
                    <p className="text-slate-400 text-sm">Continue your journey and climb the leaderboard</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/10">
            <CardContent className="p-6">
              <Link href="/auth/register" className="block">
                <div className="space-y-4">
                  <div className="bg-green-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Register</h3>
                    <p className="text-slate-400 text-sm">Create an account and start your tic-tac-toe adventure</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
          <div className="text-center space-y-2">
            <div className="bg-purple-600/20 w-10 h-10 rounded-full flex items-center justify-center mx-auto">
              <span className="text-purple-400 font-bold">AI</span>
            </div>
            <h4 className="text-white font-medium">Smart AI</h4>
            <p className="text-slate-500 text-xs">Easy, Medium & Hard difficulty levels</p>
          </div>
          <div className="text-center space-y-2">
            <div className="bg-orange-600/20 w-10 h-10 rounded-full flex items-center justify-center mx-auto">
              <span className="text-orange-400 font-bold">MP</span>
            </div>
            <h4 className="text-white font-medium">Multiplayer</h4>
            <p className="text-slate-500 text-xs">Create rooms & play with friends</p>
          </div>
          <div className="text-center space-y-2">
            <div className="bg-yellow-600/20 w-10 h-10 rounded-full flex items-center justify-center mx-auto">
              <span className="text-yellow-400 font-bold">LB</span>
            </div>
            <h4 className="text-white font-medium">Leaderboard</h4>
            <p className="text-slate-500 text-xs">Compete & track your progress</p>
          </div>
        </div>
      </div>
    </div>
  )
}
