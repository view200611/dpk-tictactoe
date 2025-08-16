"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Copy, Users, Crown, RotateCcw, CheckCircle } from "lucide-react"
import GameBoard from "@/components/game-board"
import { createEmptyBoard, makeMove, getGameResult, type Board, type Player, type GameResult } from "@/lib/game-logic"
import { supabase } from "@/lib/supabase/client"

interface RoomData {
  id: string
  room_code: string
  creator_id: string
  player1_id: string
  player2_id: string | null
  status: "waiting" | "playing" | "completed"
  board_state: any
  current_player: string | null
  winner: string | null
  creator: { username: string }
  player2: { username: string } | null
}

export default function RoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState<string>("")
  const [room, setRoom] = useState<RoomData | null>(null)
  const [board, setBoard] = useState<Board>(createEmptyBoard())
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X")
  const [gameResult, setGameResult] = useState<GameResult>("ongoing")
  const [winner, setWinner] = useState<Player>("")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sessionStats, setSessionStats] = useState({ wins: 0, losses: 0, draws: 0 })

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setRoomCode(resolvedParams.roomCode)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    const loadRoom = async () => {
      if (!roomCode) return

      try {
        console.log("[v0] Loading room:", roomCode)
        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select(`
            *,
            creator:users!creator_id(username),
            player2:users!player2_id(username)
          `)
          .eq("room_code", roomCode.toUpperCase())
          .single()

        if (roomError || !roomData) {
          console.error("[v0] Room error:", roomError)
          setError("Room not found or expired")
          return
        }

        console.log("[v0] Room data loaded:", roomData)
        setRoom(roomData)

        if (!user && roomData.status === "waiting" && !roomData.player2_id) {
          console.log("[v0] Redirecting to login to join room")
          router.push(`/auth/login?redirect=/multiplayer/room/${roomCode}`)
          return
        }

        if (user && roomData.status === "waiting" && !roomData.player2_id && roomData.creator_id !== user.id) {
          console.log("[v0] Auto-joining room as player2")
          const { error: joinError } = await supabase
            .from("rooms")
            .update({
              player2_id: user.id,
              status: "playing",
            })
            .eq("id", roomData.id)
            .eq("status", "waiting")

          if (!joinError) {
            const { data: updatedRoomData } = await supabase
              .from("rooms")
              .select(`
                *,
                creator:users!creator_id(username),
                player2:users!player2_id(username)
              `)
              .eq("id", roomData.id)
              .single()

            if (updatedRoomData) {
              setRoom(updatedRoomData)
            }
          }
        }

        if (roomData.board_state) {
          let parsedBoard = roomData.board_state
          if (typeof roomData.board_state === "string") {
            try {
              parsedBoard = JSON.parse(roomData.board_state)
            } catch (e) {
              console.error("Error parsing board_state:", e)
              parsedBoard = createEmptyBoard()
            }
          }

          setBoard(parsedBoard)
          setCurrentPlayer(roomData.current_player || "X")

          const result = getGameResult(parsedBoard, roomData.current_player || "X")
          setGameResult(result.result)
          setWinner(result.winner)
        }
      } catch (err) {
        console.error("Error loading room:", err)
        setError("Failed to load room")
      } finally {
        setLoading(false)
      }
    }

    if (roomCode) {
      loadRoom()
    }
  }, [roomCode, user, router])

  useEffect(() => {
    if (!room) return

    const roomSubscription = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        async (payload) => {
          console.log("[v0] Room update received:", payload)
          if (payload.eventType === "UPDATE") {
            const { data: updatedRoomData } = await supabase
              .from("rooms")
              .select(`
                *,
                creator:users!creator_id(username),
                player2:users!player2_id(username)
              `)
              .eq("id", room.id)
              .single()

            if (updatedRoomData) {
              console.log("[v0] Updated room data:", updatedRoomData)
              setRoom(updatedRoomData)

              if (updatedRoomData.board_state) {
                let parsedBoard = updatedRoomData.board_state
                if (typeof updatedRoomData.board_state === "string") {
                  try {
                    parsedBoard = JSON.parse(updatedRoomData.board_state)
                  } catch (e) {
                    console.error("Error parsing board_state:", e)
                    parsedBoard = createEmptyBoard()
                  }
                }

                setBoard(parsedBoard)
                setCurrentPlayer(updatedRoomData.current_player || "X")

                const result = getGameResult(parsedBoard, updatedRoomData.current_player || "X")
                setGameResult(result.result)
                setWinner(result.winner)
              }
            }
          }
        },
      )
      .subscribe()

    return () => {
      roomSubscription.unsubscribe()
    }
  }, [room])

  const handleCellClick = async (index: number) => {
    if (!room || !user || gameResult !== "ongoing") return

    const isCreator = user.id === room.creator_id
    const playerSymbol = isCreator ? "X" : "O"

    if (currentPlayer !== playerSymbol || board[index] !== "") return

    try {
      const newBoard = makeMove(board, index, playerSymbol)
      const nextPlayer = playerSymbol === "X" ? "O" : "X"
      const result = getGameResult(newBoard, nextPlayer)

      const updateData: any = {
        board_state: newBoard,
        current_player: result.result === "ongoing" ? nextPlayer : currentPlayer,
      }

      if (result.result !== "ongoing") {
        updateData.status = "completed"
        updateData.winner = result.winner === "X" ? room.creator_id : result.winner === "O" ? room.player2_id : null

        if (result.result === "win" && result.winner === playerSymbol) {
          setSessionStats((prev) => ({ ...prev, wins: prev.wins + 1 }))
        } else if (result.result === "win" && result.winner !== playerSymbol) {
          setSessionStats((prev) => ({ ...prev, losses: prev.losses + 1 }))
        } else if (result.result === "draw") {
          setSessionStats((prev) => ({ ...prev, draws: prev.draws + 1 }))
        }
      }

      await supabase.from("rooms").update(updateData).eq("id", room.id)

      if (result.result !== "ongoing") {
        await supabase.from("games").insert({
          player1_id: room.creator_id,
          player2_id: room.player2_id,
          game_type: "multiplayer",
          board_state: newBoard,
          result: result.result === "draw" ? "draw" : result.winner === "X" ? "win" : "loss",
          winner_id: result.winner === "X" ? room.creator_id : result.winner === "O" ? room.player2_id : null,
        })
      }
    } catch (err) {
      console.error("Error making move:", err)
    }
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode.toUpperCase())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetGame = async () => {
    if (!room || !user || user.id !== room.creator_id) return

    try {
      await supabase
        .from("rooms")
        .update({
          status: "playing",
          board_state: createEmptyBoard(),
          current_player: "X",
          winner: null,
        })
        .eq("id", room.id)
    } catch (err) {
      console.error("Error resetting game:", err)
    }
  }

  const getWinningCells = (): number[] => {
    if (winner === "") return []

    const winningCombinations = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // columns
      [0, 4, 8],
      [2, 4, 6], // diagonals
    ]

    for (const combination of winningCombinations) {
      const [a, b, c] = combination
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return combination
      }
    }
    return []
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading room...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <Button onClick={() => router.push("/multiplayer")} variant="outline">
            Back to Multiplayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => router.push("/multiplayer")}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Leave Room
          </Button>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {roomCode.toUpperCase()}
            </Badge>
            <Button
              onClick={copyRoomCode}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {(sessionStats.wins > 0 || sessionStats.losses > 0 || sessionStats.draws > 0) && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Session Stats</h3>
              <div className="flex space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{sessionStats.wins}</div>
                  <div className="text-sm text-slate-400">Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{sessionStats.losses}</div>
                  <div className="text-sm text-slate-400">Losses</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{sessionStats.draws}</div>
                  <div className="text-sm text-slate-400">Draws</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Room Status</h2>
                <Badge
                  className={
                    room?.status === "waiting"
                      ? "bg-yellow-600"
                      : room?.status === "playing"
                        ? "bg-green-600"
                        : "bg-blue-600"
                  }
                >
                  {room?.status === "waiting" ? "Waiting" : room?.status === "playing" ? "Playing" : "Completed"}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="text-slate-300">Host: {room?.creator.username}</span>
                  {user?.id === room?.creator_id && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                      You
                    </Badge>
                  )}
                </div>

                {room?.player2 ? (
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-slate-300">Guest: {room.player2.username}</span>
                    {user?.id === room?.player2_id && (
                      <Badge variant="outline" className="border-blue-500 text-blue-500">
                        You
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-500">Waiting for guest...</span>
                  </div>
                )}
              </div>

              {room?.status === "waiting" && !room.player2_id && (
                <div className="mt-4 text-center">
                  <p className="text-slate-400 text-sm">Share the room code with a friend to start playing!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {room?.status !== "waiting" && (
            <>
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6 text-center">
                  {gameResult === "ongoing" && (
                    <div className="space-y-2">
                      <p className="text-lg text-white">
                        {currentPlayer === (user?.id === room?.creator_id ? "X" : "O")
                          ? "Your turn"
                          : "Opponent's turn"}
                      </p>
                      <div className="flex justify-center space-x-2">
                        <Badge variant="outline" className="border-blue-500 text-blue-400">
                          You are {user?.id === room?.creator_id ? "X" : "O"}
                        </Badge>
                      </div>
                    </div>
                  )}
                  {gameResult === "win" && (
                    <div className="space-y-2">
                      <p className="text-2xl font-bold text-white">
                        {winner === (user?.id === room?.creator_id ? "X" : "O") ? "🎉 You Won!" : "😔 You Lost!"}
                      </p>
                      <p className="text-slate-400">
                        {winner === (user?.id === room?.creator_id ? "X" : "O")
                          ? "Great job!"
                          : "Better luck next time!"}
                      </p>
                    </div>
                  )}
                  {gameResult === "draw" && (
                    <div className="space-y-2">
                      <p className="text-2xl font-bold text-white">🤝 It's a Draw!</p>
                      <p className="text-slate-400">Well played!</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <GameBoard
                board={board}
                onCellClick={handleCellClick}
                disabled={currentPlayer !== (user?.id === room?.creator_id ? "X" : "O") || gameResult !== "ongoing"}
                winningCells={getWinningCells()}
              />

              {gameResult !== "ongoing" && user?.id === room?.creator_id && (
                <div className="flex justify-center">
                  <Button onClick={resetGame} className="bg-blue-600 hover:bg-blue-700">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Play Again
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
