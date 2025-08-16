import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, Medal, Award, Crown } from "lucide-react"
import Link from "next/link"

interface LeaderboardUser {
  id: string
  username: string
  wins: number
  draws: number
  losses: number
  total_score: number
  total_games: number
  is_online: boolean
  last_seen: string
  games: {
    game_type: string
    result: string
    created_at: string
  }[]
  gamesByType?: any // Include breakdown for debugging
}

export default async function LeaderboardPage() {
  // If Supabase is not configured, show setup message
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Get the current user
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, redirect to login
  if (!user) {
    redirect("/auth/login")
  }

  await supabase
    .from("users")
    .update({
      last_seen: new Date().toISOString(),
      is_online: true,
    })
    .eq("id", user.id)

  const { data: leaderboardData, error } = await supabase
    .from("users")
    .select(`
      id, 
      username, 
      wins, 
      draws, 
      losses, 
      total_score,
      is_online,
      last_seen,
      games:games!games_player1_id_fkey(
        game_type,
        result,
        created_at
      )
    `)
    .not("username", "is", null)
    .order("total_score", { ascending: false })
    .order("wins", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching leaderboard:", error)
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const leaderboard: LeaderboardUser[] =
    leaderboardData?.map((user) => {
      const isOnline = user.last_seen && user.last_seen > fiveMinutesAgo

      // Count games by type to ensure hard AI games are included
      const gamesByType =
        user.games?.reduce((acc: any, game: any) => {
          acc[game.game_type] = (acc[game.game_type] || 0) + 1
          return acc
        }, {}) || {}

      return {
        ...user,
        is_online: isOnline,
        total_games: user.wins + user.draws + user.losses,
        gamesByType, // Include breakdown for debugging
      }
    }) || []

  const onlineUsersCount = leaderboard.filter((user) => user.is_online).length

  // Find current user's position
  const currentUserPosition = leaderboard.findIndex((u) => u.id === user.id) + 1

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <Trophy className="h-5 w-5 text-slate-500" />
    }
  }

  const getRankBadge = (position: number) => {
    switch (position) {
      case 1:
        return <Badge className="bg-yellow-600 text-white">1st</Badge>
      case 2:
        return <Badge className="bg-gray-600 text-white">2nd</Badge>
      case 3:
        return <Badge className="bg-amber-600 text-white">3rd</Badge>
      default:
        return (
          <Badge variant="outline" className="border-slate-600 text-slate-400">
            {position}th
          </Badge>
        )
    }
  }

  const getWinRate = (wins: number, totalGames: number) => {
    if (totalGames === 0) return "0%"
    return `${Math.round((wins / totalGames) * 100)}%`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          {currentUserPosition > 0 && (
            <Badge variant="outline" className="border-blue-500 text-blue-400">
              Your Rank: #{currentUserPosition}
            </Badge>
          )}
        </div>

        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          <div className="flex justify-center">
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-slate-300 text-sm">
                {onlineUsersCount} player{onlineUsersCount !== 1 ? "s" : ""} online
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Scoring System Info */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Scoring System</CardTitle>
            <CardDescription className="text-slate-400">
              How points are calculated across all game modes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-400">+2</div>
                <div className="text-sm text-slate-400">Win</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-yellow-400">+1</div>
                <div className="text-sm text-slate-400">Draw</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-red-400">-1</div>
                <div className="text-sm text-slate-400">Loss</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 text-center">
              Points earned from all game modes: AI Easy/Medium/Hard and Multiplayer
            </div>
          </CardContent>
        </Card>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-center">Top Players</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center items-end space-x-4">
                {/* 2nd Place */}
                <div className="text-center space-y-2">
                  <div className="bg-gray-600 h-20 w-24 rounded-t-lg flex items-end justify-center pb-2">
                    <Medal className="h-8 w-8 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-white text-sm">{leaderboard[1].username}</p>
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-2 h-2 rounded-full ${leaderboard[1].is_online ? "bg-green-400" : "bg-gray-400"}`}
                      ></div>
                    </div>
                    <p className="text-gray-400 text-xs">{leaderboard[1].total_score} pts</p>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="text-center space-y-2">
                  <div className="bg-yellow-600 h-28 w-24 rounded-t-lg flex items-end justify-center pb-2">
                    <Crown className="h-10 w-10 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-white">{leaderboard[0].username}</p>
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-2 h-2 rounded-full ${leaderboard[0].is_online ? "bg-green-400" : "bg-gray-400"}`}
                      ></div>
                    </div>
                    <p className="text-yellow-400 text-sm">{leaderboard[0].total_score} pts</p>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="text-center space-y-2">
                  <div className="bg-amber-600 h-16 w-24 rounded-t-lg flex items-end justify-center pb-2">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-white text-sm">{leaderboard[2].username}</p>
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-2 h-2 rounded-full ${leaderboard[2].is_online ? "bg-green-400" : "bg-gray-400"}`}
                      ></div>
                    </div>
                    <p className="text-amber-400 text-xs">{leaderboard[2].total_score} pts</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Leaderboard */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Rankings</CardTitle>
            <CardDescription className="text-slate-400">
              {leaderboard.length} players ranked by total score
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No players have played games yet.</p>
                <p className="text-slate-500 text-sm">Be the first to start playing!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((player, index) => {
                  const position = index + 1
                  const isCurrentUser = player.id === user.id

                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                        isCurrentUser
                          ? "bg-blue-600/20 border border-blue-500/50"
                          : "bg-slate-700/50 hover:bg-slate-700"
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getRankIcon(position)}
                          {getRankBadge(position)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className={`font-semibold ${isCurrentUser ? "text-blue-400" : "text-white"}`}>
                              {player.username}
                              {isCurrentUser && (
                                <Badge variant="outline" className="ml-2 border-blue-500 text-blue-400 text-xs">
                                  You
                                </Badge>
                              )}
                            </p>
                            <div
                              className={`w-2 h-2 rounded-full ${player.is_online ? "bg-green-400" : "bg-gray-400"}`}
                            ></div>
                          </div>
                          <p className="text-sm text-slate-400">
                            {player.total_games} games • {getWinRate(player.wins, player.total_games)} win rate
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className="flex space-x-4 text-sm">
                            <span className="text-green-400">{player.wins}W</span>
                            <span className="text-yellow-400">{player.draws}D</span>
                            <span className="text-red-400">{player.losses}L</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold ${isCurrentUser ? "text-blue-400" : "text-white"}`}>
                            {player.total_score}
                          </p>
                          <p className="text-xs text-slate-400">points</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call to Action */}
        {leaderboard.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Ready to climb the ranks?</h3>
              <p className="text-slate-400 mb-4">Play more games to improve your position on the leaderboard!</p>
              <div className="flex justify-center space-x-4">
                <Link href="/game/ai">
                  <Button className="bg-blue-600 hover:bg-blue-700">Play vs AI</Button>
                </Link>
                <Link href="/multiplayer">
                  <Button className="bg-green-600 hover:bg-green-700">Play Multiplayer</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
