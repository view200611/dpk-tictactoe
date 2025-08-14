export type Player = "X" | "O" | ""
export type Board = Player[]
export type GameResult = "win" | "draw" | "ongoing"
export type Difficulty = "easy" | "medium" | "hard"

// Initialize empty board
export function createEmptyBoard(): Board {
  return Array(9).fill("")
}

// Check if a move is valid
export function isValidMove(board: Board, index: number): boolean {
  return index >= 0 && index < 9 && board[index] === ""
}

// Make a move on the board
export function makeMove(board: Board, index: number, player: Player): Board {
  if (!isValidMove(board, index)) {
    throw new Error("Invalid move")
  }
  const newBoard = [...board]
  newBoard[index] = player
  return newBoard
}

// Check for winner
export function checkWinner(board: Board): Player {
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

  for (const [a, b, c] of winningCombinations) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }
  return ""
}

// Check if board is full
export function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== "")
}

// Get game result
export function getGameResult(board: Board, currentPlayer: Player): { result: GameResult; winner: Player } {
  const winner = checkWinner(board)
  if (winner) {
    return { result: "win", winner }
  }
  if (isBoardFull(board)) {
    return { result: "draw", winner: "" }
  }
  return { result: "ongoing", winner: "" }
}

// Get available moves
export function getAvailableMoves(board: Board): number[] {
  return board.map((cell, index) => (cell === "" ? index : -1)).filter((index) => index !== -1)
}

// AI Move Functions

// Easy AI - Random moves
export function getEasyAIMove(board: Board): number {
  const availableMoves = getAvailableMoves(board)
  return availableMoves[Math.floor(Math.random() * availableMoves.length)]
}

// Medium AI - Some strategy but not perfect
export function getMediumAIMove(board: Board, aiPlayer: Player): number {
  const humanPlayer = aiPlayer === "X" ? "O" : "X"
  const availableMoves = getAvailableMoves(board)

  // 1. Try to win
  for (const move of availableMoves) {
    const testBoard = makeMove(board, move, aiPlayer)
    if (checkWinner(testBoard) === aiPlayer) {
      return move
    }
  }

  // 2. Block opponent from winning
  for (const move of availableMoves) {
    const testBoard = makeMove(board, move, humanPlayer)
    if (checkWinner(testBoard) === humanPlayer) {
      return move
    }
  }

  // 3. Take center if available
  if (availableMoves.includes(4)) {
    return 4
  }

  // 4. Take corners
  const corners = [0, 2, 6, 8].filter((corner) => availableMoves.includes(corner))
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)]
  }

  // 5. Random move
  return availableMoves[Math.floor(Math.random() * availableMoves.length)]
}

// Hard AI - Minimax algorithm
export function getHardAIMove(board: Board, aiPlayer: Player): number {
  const humanPlayer = aiPlayer === "X" ? "O" : "X"

  function minimax(board: Board, depth: number, isMaximizing: boolean): number {
    const winner = checkWinner(board)

    if (winner === aiPlayer) return 10 - depth
    if (winner === humanPlayer) return depth - 10
    if (isBoardFull(board)) return 0

    if (isMaximizing) {
      let bestScore = Number.NEGATIVE_INFINITY
      for (const move of getAvailableMoves(board)) {
        const newBoard = makeMove(board, move, aiPlayer)
        const score = minimax(newBoard, depth + 1, false)
        bestScore = Math.max(score, bestScore)
      }
      return bestScore
    } else {
      let bestScore = Number.POSITIVE_INFINITY
      for (const move of getAvailableMoves(board)) {
        const newBoard = makeMove(board, move, humanPlayer)
        const score = minimax(newBoard, depth + 1, true)
        bestScore = Math.min(score, bestScore)
      }
      return bestScore
    }
  }

  let bestMove = -1
  let bestScore = Number.NEGATIVE_INFINITY

  for (const move of getAvailableMoves(board)) {
    const newBoard = makeMove(board, move, aiPlayer)
    const score = minimax(newBoard, 0, false)
    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}

// Get AI move based on difficulty
export function getAIMove(board: Board, difficulty: Difficulty, aiPlayer: Player): number {
  switch (difficulty) {
    case "easy":
      return getEasyAIMove(board)
    case "medium":
      return getMediumAIMove(board, aiPlayer)
    case "hard":
      return getHardAIMove(board, aiPlayer)
    default:
      return getEasyAIMove(board)
  }
}
