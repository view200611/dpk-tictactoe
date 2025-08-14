"use server"

import { createClient } from "@/lib/supabase/server"

// Send a chat message
export async function sendMessage(prevState: any, formData: FormData) {
  try {
    const roomId = formData.get("roomId")?.toString()
    const message = formData.get("message")?.toString()?.trim()

    if (!roomId || !message) {
      return { error: "Room ID and message are required" }
    }

    if (message.length > 500) {
      return { error: "Message too long (max 500 characters)" }
    }

    const supabase = createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "You must be logged in to send messages" }
    }

    // Verify user is part of the room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, player1_id, player2_id")
      .eq("id", roomId)
      .single()

    if (roomError || !room) {
      return { error: "Room not found" }
    }

    if (room.player1_id !== user.id && room.player2_id !== user.id) {
      return { error: "You are not part of this room" }
    }

    // Send message
    const { error: messageError } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_id: user.id,
      message: message,
    })

    if (messageError) {
      console.error("Send message error:", messageError)
      return { error: "Failed to send message" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error sending message:", error)
    return { error: "An unexpected error occurred" }
  }
}

// Get chat messages for a room
export async function getChatMessages(roomId: string) {
  try {
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "You must be logged in" }
    }

    // Verify user is part of the room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, player1_id, player2_id")
      .eq("id", roomId)
      .single()

    if (roomError || !room) {
      return { error: "Room not found" }
    }

    if (room.player1_id !== user.id && room.player2_id !== user.id) {
      return { error: "You are not part of this room" }
    }

    // Get messages with sender info
    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select(`
        id,
        message,
        created_at,
        sender_id,
        sender:sender_id(username)
      `)
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100) // Limit to last 100 messages

    if (error) {
      console.error("Get messages error:", error)
      return { error: "Failed to load messages" }
    }

    return { success: true, messages: messages || [] }
  } catch (error) {
    console.error("Error getting messages:", error)
    return { error: "An unexpected error occurred" }
  }
}
