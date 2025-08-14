"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Player } from "@/lib/game-logic"
import { cn } from "@/lib/utils"
import { Trophy, Flame } from "lucide-react"

interface GameBoardProps {
  board: Player[]
  onCellClick: (index: number) => void
  disabled?: boolean
  winningCells?: number[]
  showStats?: boolean
  playerXWins?: number
  playerOWins?: number
  draws?: number
  currentStreak?: number
}

export default function GameBoard({
  board,
  onCellClick,
  disabled = false,
  winningCells = [],
  showStats = false,
  playerXWins = 0,
  playerOWins = 0,
  draws = 0,
  currentStreak = 0,
}: GameBoardProps) {
  return (
    <div className="space-y-4">
      {/* Session Stats */}
      {showStats && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-400" />
              Session Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-400">{playerXWins}</div>
                <div className="text-xs text-slate-400">Your Wins</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-red-400">{playerOWins}</div>
                <div className="text-xs text-slate-400">AI Wins</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-yellow-400">{draws}</div>
                <div className="text-xs text-slate-400">Draws</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center space-x-1">
                  {currentStreak > 0 && <Flame className="h-4 w-4 text-orange-400" />}
                  <div className="text-2xl font-bold text-orange-400">{currentStreak}</div>
                </div>
                <div className="text-xs text-slate-400">Win Streak</div>
              </div>
            </div>

            {currentStreak >= 3 && (
              <div className="mt-3 text-center">
                <Badge className="bg-orange-600 text-white animate-pulse">
                  🔥 On Fire! {currentStreak} wins in a row!
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Game Board */}
      <Card className="p-6 bg-slate-800 border-slate-700 shadow-2xl">
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {board.map((cell, index) => (
            <Button
              key={index}
              onClick={() => onCellClick(index)}
              disabled={disabled || cell !== ""}
              className={cn(
                "h-20 w-20 text-4xl font-bold transition-all duration-300 transform hover:scale-105",
                "bg-slate-700 hover:bg-slate-600 border-2 border-slate-600 hover:border-slate-500",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800",
                winningCells.includes(index) && "bg-green-600 hover:bg-green-600 border-green-500 animate-pulse",
                cell === "X" && "text-blue-400 shadow-lg shadow-blue-400/20",
                cell === "O" && "text-red-400 shadow-lg shadow-red-400/20",
                cell === "" && "text-slate-500 hover:text-slate-300",
              )}
            >
              <span className="drop-shadow-lg">{cell}</span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  )
}
