"use server"

import { createClient } from "@/lib/supabase/server"

// Helper function to create an empty board
function createEmptyBoard(): string[][] {
  return Array.from({ length: 3 }, () => Array(3).fill(null))
}

// Generate a random room code (moved to utils since it's not async)
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Create a new room
export async function createRoom(prevState: any, formData: FormData) {
  try {
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "You must be logged in to create a room" }
    }

    // Generate unique room code
    let roomCode = generateRoomCode()
    let attempts = 0

    while (attempts < 10) {
      const { data: existingRoom } = await supabase.from("rooms").select("id").eq("room_code", roomCode).single()

      if (!existingRoom) break

      roomCode = generateRoomCode()
      attempts++
    }

    if (attempts >= 10) {
      return { error: "Failed to generate unique room code. Please try again." }
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 2)

    // Create room
    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        room_code: roomCode,
        creator_id: user.id,
        player1_id: user.id,
        status: "waiting",
        current_player: "X",
        board_state: JSON.stringify(createEmptyBoard()),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Room creation error:", error)
      return { error: "Failed to create room: " + error.message }
    }

    return { success: true, roomCode: roomCode }
  } catch (error) {
    console.error("Error creating room:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Join an existing room
export async function joinRoom(prevState: any, formData: FormData) {
  try {
    const roomCode = formData.get("roomCode")?.toString().toUpperCase()

    if (!roomCode) {
      return { error: "Room code is required" }
    }

    const supabase = createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "You must be logged in to join a room" }
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", roomCode)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (roomError || !room) {
      return { error: "Room not found or has expired" }
    }

    // Check if room is available
    if (room.status !== "waiting") {
      return { error: "Room is not available" }
    }

    // Check if user is already in room
    if (room.creator_id === user.id) {
      return { success: true, roomCode: roomCode }
    }

    if (room.player2_id) {
      return { error: "Room is full" }
    }

    // Join room
    const { error: updateError } = await supabase
      .from("rooms")
      .update({
        player2_id: user.id,
        status: "playing",
      })
      .eq("id", room.id)

    if (updateError) {
      console.error("Join room error:", updateError)
      return { error: "Failed to join room: " + updateError.message }
    }

    return { success: true, roomCode: roomCode }
  } catch (error) {
    console.error("Error joining room:", error)
    return { error: "An unexpected error occurred" }
  }
}
