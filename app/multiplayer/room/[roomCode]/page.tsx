"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Copy, Users, Crown, RotateCcw, CheckCircle } from "lucide-react"
import GameBoard from "@/components/game-board"
import { ChatBox } from "@/components/chat-box"
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

export default function RoomPage({ params }: { params: { roomCode: string } }) {
  const { roomCode } = params
  const router = useRouter()
  const [room, setRoom] = useState<RoomData | null>(null)
  const [board, setBoard] = useState<Board>(createEmptyBoard())
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X")
  const [gameResult, setGameResult] = useState<GameResult>("ongoing")
  const [winner, setWinner] = useState<Player>("")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  // Load room data
  useEffect(() => {
    const loadRoom = async () => {
      try {
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
          console.error("Room error:", roomError)
          setError("Room not found")
          return
        }

        setRoom(roomData)

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
  }, [roomCode])

  // Real-time subscriptions
  useEffect(() => {
    if (!room) return

    // Subscribe to room changes
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
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updatedRoom = payload.new as RoomData
            setRoom((prev) => ({ ...prev, ...updatedRoom }))

            if (updatedRoom.board_state) {
              let parsedBoard = updatedRoom.board_state
              if (typeof updatedRoom.board_state === "string") {
                try {
                  parsedBoard = JSON.parse(updatedRoom.board_state)
                } catch (e) {
                  console.error("Error parsing board_state:", e)
                  parsedBoard = createEmptyBoard()
                }
              }

              setBoard(parsedBoard)
              setCurrentPlayer(updatedRoom.current_player || "X")

              const result = getGameResult(parsedBoard, updatedRoom.current_player || "X")
              setGameResult(result.result)
              setWinner(result.winner)
            }
          }
        },
      )
      .subscribe()

    return () => {
      roomSubscription.unsubscribe()
    }
  }, [room])

  const startGame = async () => {
    if (!room || !user || room.status !== "waiting" || !room.player2_id) return

    try {
      await supabase
        .from("rooms")
        .update({
          status: "playing",
          board_state: createEmptyBoard(),
          current_player: "X",
        })
        .eq("id", room.id)
    } catch (err) {
      console.error("Error starting game:", err)
    }
  }

  const handleCellClick = async (index: number) => {
    if (!room || !user || gameResult !== "ongoing") return

    // Check if it's the player's turn
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

  // ... existing loading and error states ...

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Loading room...</div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            <p className="text-red-400 mb-4">{error || "Room not found"}</p>
            <Button onClick={() => router.push("/multiplayer")} className="bg-blue-600 hover:bg-blue-700">
              Back to Multiplayer
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isCreator = user?.id === room.creator_id
  const isPlayer2 = user?.id === room.player2_id
  const playerSymbol = isCreator ? "X" : "O"

  // Get winning cells for highlighting
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Room Status */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Room Status</h2>
                  <Badge
                    className={
                      room.status === "waiting"
                        ? "bg-yellow-600"
                        : room.status === "playing"
                          ? "bg-green-600"
                          : "bg-blue-600"
                    }
                  >
                    {room.status === "waiting" ? "Waiting" : room.status === "playing" ? "Playing" : "Completed"}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="text-slate-300">Host: {room.creator.username}</span>
                    {isCreator && (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                        You
                      </Badge>
                    )}
                  </div>

                  {room.player2 ? (
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-slate-300">Guest: {room.player2.username}</span>
                      {isPlayer2 && (
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

                {room.status === "waiting" && room.player2_id && isCreator && (
                  <Button onClick={startGame} className="w-full mt-4 bg-green-600 hover:bg-green-700">
                    Start Game
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Game */}
            {room.status !== "waiting" && (
              <>
                {/* Game Status */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6 text-center">
                    {gameResult === "ongoing" && (
                      <div className="space-y-2">
                        <p className="text-lg text-white">
                          {currentPlayer === playerSymbol ? "Your turn" : "Opponent's turn"}
                        </p>
                        <div className="flex justify-center space-x-2">
                          <Badge variant="outline" className="border-blue-500 text-blue-400">
                            You are {playerSymbol}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {gameResult === "win" && (
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-white">
                          {winner === playerSymbol ? "🎉 You Won!" : "😔 You Lost!"}
                        </p>
                        <p className="text-slate-400">
                          {winner === playerSymbol ? "Great job!" : "Better luck next time!"}
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

                {/* Game Board */}
                <GameBoard
                  board={board}
                  onCellClick={handleCellClick}
                  disabled={currentPlayer !== playerSymbol || gameResult !== "ongoing"}
                  winningCells={getWinningCells()}
                />

                {/* Game Controls */}
                {gameResult !== "ongoing" && isCreator && (
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

          <div className="lg:col-span-1">
            {room.player2_id && user && <ChatBox roomId={room.id} currentUserId={user.id} />}
            {!room.player2_id && (
              <Card className="h-80">
                <CardContent className="p-6 flex items-center justify-center h-full">
                  <div className="text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Chat will be available when both players join</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
