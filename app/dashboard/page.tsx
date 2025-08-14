"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Bot, Users, Trophy, TrendingUp, Target, Zap, UserPlus } from "lucide-react"
import { signOut } from "@/lib/actions"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [recentGames, setRecentGames] = useState([])
  const [ongoingGames, setOngoingGames] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      // Get user profile with stats
      const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
      setUserProfile(profile)

      const { data: games } = await supabase
        .from("games")
        .select(`
          id,
          game_type,
          result,
          created_at,
          board_state,
          player2_id,
          users!games_player2_id_fkey(username)
        `)
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(10)
      setRecentGames(games || [])

      const { data: ongoing } = await supabase
        .from("rooms")
        .select(`
          id,
          room_code,
          status,
          created_at,
          board_state,
          current_player,
          creator_id,
          player2_id,
          creator:users!creator_id(username),
          player2:users!player2_id(username)
        `)
        .or(`creator_id.eq.${user.id},player2_id.eq.${user.id}`)
        .in("status", ["waiting", "playing"])
        .order("created_at", { ascending: false })
      setOngoingGames(ongoing || [])

      setLoading(false)
    }

    getUser()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  const totalGames = (userProfile?.wins || 0) + (userProfile?.draws || 0) + (userProfile?.losses || 0)
  const winRate = totalGames > 0 ? Math.round(((userProfile?.wins || 0) / totalGames) * 100) : 0

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">
              Welcome back, {userProfile?.username || user?.email?.split("@")[0]}
            </h1>
            <p className="text-slate-400 text-lg">Ready for another challenge?</p>
          </div>
          <div className="flex items-center space-x-3">
            <form action={signOut}>
              <Button
                type="submit"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">{userProfile?.wins || 0}</div>
              <div className="text-sm text-slate-400">Wins</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-1">{userProfile?.draws || 0}</div>
              <div className="text-sm text-slate-400">Draws</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-400 mb-1">{userProfile?.losses || 0}</div>
              <div className="text-sm text-slate-400">Losses</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">{userProfile?.total_score || 0}</div>
              <div className="text-sm text-slate-400">Score</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-200">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-1">{winRate}%</div>
              <div className="text-sm text-slate-400">Win Rate</div>
            </CardContent>
          </Card>
        </div>

        {ongoingGames && ongoingGames.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-400" />
                Ongoing Games
              </CardTitle>
              <CardDescription className="text-slate-400">Continue your active matches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ongoingGames.map((room) => {
                  const isCreator = room.creator_id === user.id
                  const opponent = isCreator ? room.player2?.username : room.creator?.username
                  const isYourTurn =
                    (room.current_player === "X" && isCreator) || (room.current_player === "O" && !isCreator)

                  return (
                    <div key={room.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div className="space-y-1">
                        <p className="text-white font-medium">vs {opponent || "Unknown Player"}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="border-blue-500 text-blue-400 text-xs">
                            Multiplayer
                          </Badge>
                          {room.status === "waiting" && (
                            <Badge className="bg-yellow-600 text-white text-xs">Waiting</Badge>
                          )}
                          {room.status === "playing" && isYourTurn && (
                            <Badge className="bg-green-600 text-white text-xs">Your Turn</Badge>
                          )}
                        </div>
                      </div>
                      <Link href={`/multiplayer/room/${room.room_code}`}>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Continue
                        </Button>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game Modes */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-600/10 to-blue-800/10 border-blue-700/50 hover:from-blue-600/20 hover:to-blue-800/20 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center text-xl">
                <Bot className="h-6 w-6 mr-3 text-blue-400" />
                Play vs AI
              </CardTitle>
              <CardDescription className="text-slate-300">
                Challenge the computer with three difficulty levels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-green-400" />
                  <span className="text-slate-400">Easy</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-yellow-400" />
                  <span className="text-slate-400">Medium</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-red-400" />
                  <span className="text-slate-400">Hard</span>
                </div>
              </div>
              <Link href="/game/ai">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 transition-all duration-200">
                  Start AI Game
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/10 to-green-800/10 border-green-700/50 hover:from-green-600/20 hover:to-green-800/20 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center text-xl">
                <Users className="h-6 w-6 mr-3 text-green-400" />
                Multiplayer
              </CardTitle>
              <CardDescription className="text-slate-300">Create or join rooms to play with friends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-400">
                <p>• Create private rooms</p>
                <p>• Real-time gameplay</p>
                <p>• Play with friends</p>
              </div>
              <Link href="/multiplayer">
                <Button className="w-full bg-green-600 hover:bg-green-700 transition-all duration-200">
                  Play Online
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600/10 to-orange-800/10 border-orange-700/50 hover:from-orange-600/20 hover:to-orange-800/20 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center text-xl">
                <UserPlus className="h-6 w-6 mr-3 text-orange-400" />
                Friends
              </CardTitle>
              <CardDescription className="text-slate-300">
                Coming soon - manage friends and send invites
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-400">
                <p>• Add friends</p>
                <p>• Accept requests</p>
                <p>• Chat & play together</p>
              </div>
              <Button disabled className="w-full bg-gray-600 cursor-not-allowed">
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600/10 to-purple-800/10 border-purple-700/50 hover:from-purple-600/20 hover:to-purple-800/20 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center text-xl">
                <Trophy className="h-6 w-6 mr-3 text-purple-400" />
                Leaderboard
              </CardTitle>
              <CardDescription className="text-slate-300">See how you rank against other players</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-400">
                <p>• Global rankings</p>
                <p>• Win/Draw/Loss tracking</p>
                <p>• Score-based system</p>
              </div>
              <Link href="/leaderboard">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 transition-all duration-200">
                  View Rankings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {recentGames && recentGames.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Trophy className="h-5 w-5 mr-2 text-purple-400" />
                Game History
              </CardTitle>
              <CardDescription className="text-slate-400">Your recent completed matches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentGames.map((game) => {
                  const gameType = game.game_type?.includes("ai_")
                    ? `AI ${game.game_type.split("_")[1]?.toUpperCase()}`
                    : game.game_type === "multiplayer"
                      ? "Multiplayer"
                      : "AI"
                  const opponent = game.player2_id ? game.users?.username || "Unknown Player" : "AI"

                  const resultColor =
                    game.result === "win"
                      ? "text-green-400"
                      : game.result === "draw"
                        ? "text-yellow-400"
                        : "text-red-400"

                  const resultText = game.result === "win" ? "Won" : game.result === "draw" ? "Draw" : "Lost"

                  return (
                    <div
                      key={game.id}
                      className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-white text-sm">vs {opponent}</p>
                          <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                            {gameType}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {new Date(game.created_at).toLocaleDateString()} at{" "}
                          {new Date(game.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${resultColor}`}>{resultText}</p>
                        <p className="text-xs text-slate-500">
                          {game.result === "win" ? "+2" : game.result === "draw" ? "+1" : "-1"} pts
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {recentGames.length === 10 && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-400 hover:bg-slate-700 bg-transparent"
                    onClick={() => {
                      /* Could add a full history page later */
                    }}
                  >
                    View All Games
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        {totalGames > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Your Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-2">{totalGames}</div>
                  <div className="text-slate-400">Total Games</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 mb-2">{winRate}%</div>
                  <div className="text-slate-400">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400 mb-2">{userProfile?.total_score || 0}</div>
                  <div className="text-slate-400">Total Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
