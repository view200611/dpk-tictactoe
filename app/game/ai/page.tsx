"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, RotateCcw, Trophy, Target, Zap } from "lucide-react"
import GameBoard from "@/components/game-board"
import {
  createEmptyBoard,
  makeMove,
  getGameResult,
  getAIMove,
  type Board,
  type Player,
  type Difficulty,
  type GameResult,
} from "@/lib/game-logic"
import { supabase } from "@/lib/supabase/client"

const difficultyConfig = {
  easy: { label: "Easy", icon: Zap, color: "bg-green-600", description: "Perfect for beginners" },
  medium: { label: "Medium", icon: Target, color: "bg-yellow-600", description: "Balanced challenge" },
  hard: { label: "Hard", icon: Trophy, color: "bg-red-600", description: "Ultimate challenge" },
}

export default function AIGamePage() {
  const router = useRouter()
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null)
  const [board, setBoard] = useState<Board>(createEmptyBoard())
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X")
  const [gameResult, setGameResult] = useState<GameResult>("ongoing")
  const [winner, setWinner] = useState<Player>("")
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [sessionStats, setSessionStats] = useState({
    playerWins: 0,
    aiWins: 0,
    draws: 0,
    currentStreak: 0,
    lastResult: null as "win" | "loss" | "draw" | null,
  })

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

  // Check game result whenever board changes
  useEffect(() => {
    const result = getGameResult(board, currentPlayer)
    setGameResult(result.result)
    setWinner(result.winner)

    // Save game result to database when game ends
    if (result.result !== "ongoing" && gameStarted && user) {
      saveGameResult(result.result, result.winner)

      // Update session stats
      setSessionStats((prev) => {
        const newStats = { ...prev }

        if (result.result === "draw") {
          newStats.draws += 1
          newStats.currentStreak = 0
          newStats.lastResult = "draw"
        } else if (result.winner === "X") {
          // Player won
          newStats.playerWins += 1
          newStats.currentStreak = prev.lastResult === "win" ? prev.currentStreak + 1 : 1
          newStats.lastResult = "win"
        } else if (result.winner === "O") {
          // AI won, player lost
          newStats.aiWins += 1
          newStats.currentStreak = 0
          newStats.lastResult = "loss"
        }

        return newStats
      })
    }
  }, [board, currentPlayer, gameStarted, user])

  // AI move logic
  useEffect(() => {
    if (currentPlayer === "O" && gameResult === "ongoing" && selectedDifficulty && gameStarted) {
      setIsAIThinking(true)

      // Add delay for better UX
      const timer = setTimeout(() => {
        const aiMove = getAIMove(board, selectedDifficulty, "O")
        if (aiMove !== -1) {
          const newBoard = makeMove(board, aiMove, "O")
          setBoard(newBoard)
          setCurrentPlayer("X")
        }
        setIsAIThinking(false)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [currentPlayer, gameResult, selectedDifficulty, board, gameStarted])

  const saveGameResult = async (result: GameResult, gameWinner: Player) => {
    if (!user || !selectedDifficulty) return

    if (selectedDifficulty !== "hard") {
      console.log("Skipping stats for non-hard difficulty:", selectedDifficulty)
      return
    }

    try {
      let playerResult: string
      if (result === "draw") {
        playerResult = "draw"
      } else if (gameWinner === "X") {
        playerResult = "win" // Player won
      } else {
        playerResult = "loss" // AI won, so player lost
      }

      const gameData = {
        player1_id: user.id,
        player2_id: null, // AI game
        game_type: `ai_${selectedDifficulty}`,
        board_state: board,
        result: playerResult,
        winner_id: gameWinner === "X" ? user.id : null,
      }

      const { error } = await supabase.from("games").insert(gameData)
      if (error) {
        console.error("Error saving game:", error)
      } else {
        console.log("Hard AI game saved successfully:", gameData)
      }
    } catch (error) {
      console.error("Error saving game:", error)
    }
  }

  const handleCellClick = (index: number) => {
    if (gameResult !== "ongoing" || currentPlayer !== "X" || isAIThinking || board[index] !== "") return

    const newBoard = makeMove(board, index, "X")
    setBoard(newBoard)
    setCurrentPlayer("O")
  }

  const startGame = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty)
    setBoard(createEmptyBoard())
    setCurrentPlayer("X")
    setGameResult("ongoing")
    setWinner("")
    setGameStarted(true)
  }

  const resetGame = () => {
    setBoard(createEmptyBoard())
    setCurrentPlayer("X")
    setGameResult("ongoing")
    setWinner("")
    setGameStarted(true)
    setIsAIThinking(false) // Reset AI thinking state to prevent getting stuck
    // Don't reset session stats - keep them for continuous play
  }

  const backToMenu = () => {
    setSelectedDifficulty(null)
    setGameStarted(false)
    setBoard(createEmptyBoard())
    setCurrentPlayer("X")
    setGameResult("ongoing")
    setWinner("")
    setSessionStats({
      playerWins: 0,
      aiWins: 0,
      draws: 0,
      currentStreak: 0,
      lastResult: null,
    })
  }

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

  if (!selectedDifficulty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-white">Choose Difficulty</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.entries(difficultyConfig) as [Difficulty, typeof difficultyConfig.easy][]).map(
              ([difficulty, config]) => {
                const Icon = config.icon
                return (
                  <Card
                    key={difficulty}
                    className="bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors cursor-pointer"
                    onClick={() => startGame(difficulty)}
                  >
                    <CardHeader className="text-center">
                      <div
                        className={`w-16 h-16 rounded-full ${config.color} flex items-center justify-center mx-auto mb-4`}
                      >
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-white text-2xl">{config.label}</CardTitle>
                      <CardDescription className="text-slate-400">{config.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">Play {config.label}</Button>
                    </CardContent>
                  </Card>
                )
              },
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={backToMenu}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Change Difficulty
          </Button>
          <Badge className={`${difficultyConfig[selectedDifficulty].color} text-white`}>
            {difficultyConfig[selectedDifficulty].label}
          </Badge>
        </div>

        {/* Game Status */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            {gameResult === "ongoing" && (
              <div className="space-y-2">
                <p className="text-lg text-white">
                  {isAIThinking ? "AI is thinking..." : currentPlayer === "X" ? "Your turn" : "AI's turn"}
                </p>
                <div className="flex justify-center">
                  <Badge variant="outline" className="border-blue-500 text-blue-400">
                    You are X
                  </Badge>
                </div>
              </div>
            )}
            {gameResult === "win" && (
              <div className="space-y-2">
                <p className="text-2xl font-bold text-white">{winner === "X" ? "🎉 You Won!" : "🤖 AI Won!"}</p>
                <p className="text-slate-400">{winner === "X" ? "Great job!" : "Better luck next time!"}</p>
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

        {/* Game Board with session stats */}
        <GameBoard
          board={board}
          onCellClick={handleCellClick}
          disabled={currentPlayer !== "X" || isAIThinking || gameResult !== "ongoing"}
          winningCells={getWinningCells()}
          showStats={gameStarted && sessionStats.playerWins + sessionStats.aiWins + sessionStats.draws > 0}
          playerXWins={sessionStats.playerWins}
          playerOWins={sessionStats.aiWins}
          draws={sessionStats.draws}
          currentStreak={sessionStats.currentStreak}
        />

        {/* Game Controls */}
        {gameResult !== "ongoing" && (
          <div className="flex justify-center space-x-4">
            <Button onClick={resetGame} className="bg-blue-600 hover:bg-blue-700">
              <RotateCcw className="h-4 w-4 mr-2" />
              Play Again
            </Button>
            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className="border-slate-600 hover:bg-slate-800 text-slate-200 bg-slate-500"
            >
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
