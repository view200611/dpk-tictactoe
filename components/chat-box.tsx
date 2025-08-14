"use client"

import { useState, useEffect, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"
import { sendMessage } from "@/lib/chat"
import { useFormState } from "react-dom"

interface Message {
  id: string
  message: string
  created_at: string
  sender_id: string
  sender: { username: string }
}

interface ChatBoxProps {
  roomId: string
  currentUserId: string
}

export function ChatBox({ roomId, currentUserId }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClientComponentClient()

  const [state, formAction] = useFormState(sendMessage, { error: "", success: false })

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const { data: messagesData, error } = await supabase
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
          .limit(100)

        if (error) {
          console.error("Error loading messages:", error)
        } else {
          setMessages(messagesData || [])
        }
      } catch (error) {
        console.error("Error loading messages:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMessages()
  }, [roomId, supabase])

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data: newMessage, error } = await supabase
            .from("chat_messages")
            .select(`
              id,
              message,
              created_at,
              sender_id,
              sender:sender_id(username)
            `)
            .eq("id", payload.new.id)
            .single()

          if (!error && newMessage) {
            setMessages((prev) => [...prev, newMessage])
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, supabase])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle form submission
  const handleSubmit = async (formData: FormData) => {
    if (!newMessage.trim()) return

    formData.append("roomId", roomId)
    formData.append("message", newMessage)

    await formAction(formData)

    if (state.success) {
      setNewMessage("")
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <Card className="h-80">
        <CardHeader>
          <CardTitle className="text-sm">Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading chat...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-80 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-3 pt-0">
        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.sender_id === currentUserId ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    message.sender_id === currentUserId ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <div className="font-medium text-xs opacity-70 mb-1">{message.sender?.username || "Unknown"}</div>
                  <div>{message.message}</div>
                  <div className="text-xs opacity-60 mt-1">{formatTime(message.created_at)}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <form action={handleSubmit} className="flex gap-2 mt-3">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {state.error && <div className="text-xs text-destructive mt-1">{state.error}</div>}
      </CardContent>
    </Card>
  )
}
