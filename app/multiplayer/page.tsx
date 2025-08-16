"use client"

import { useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, Users, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { createRoom, joinRoom } from "@/lib/multiplayer"

function CreateRoomButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full bg-green-600 hover:bg-green-700">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
          Create Room
        </>
      )}
    </Button>
  )
}

function JoinRoomButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full bg-blue-600 hover:bg-blue-700">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Joining...
        </>
      ) : (
        <>
          <Users className="mr-2 h-4 w-4" />
          Join Room
        </>
      )}
    </Button>
  )
}

export default function MultiplayerPage() {
  const router = useRouter()
  const [createState, createAction] = useActionState(createRoom, null)
  const [joinState, joinAction] = useActionState(joinRoom, null)

  const handleJoinAction = async (formData: FormData) => {
    const roomCode = formData.get("roomCode")?.toString()
    console.log("[v0] Join form submitted with room code:", roomCode)
    return joinAction(formData)
  }

  useEffect(() => {
    if (createState?.success && createState?.roomCode) {
      console.log("[v0] Create success, redirecting to:", createState.roomCode)
      router.push(`/multiplayer/room/${createState.roomCode}`)
    }
  }, [createState, router])

  useEffect(() => {
    console.log("[v0] Join state changed:", joinState)
    if (joinState?.success && joinState?.roomCode) {
      console.log("[v0] Join success, redirecting to:", joinState.roomCode)
      router.push(`/multiplayer/room/${joinState.roomCode}`)
    }
  }, [joinState, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => router.push("/dashboard")}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-white">Multiplayer</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Room */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Create Room
              </CardTitle>
              <CardDescription className="text-slate-400">Create a new room and invite friends to play</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createAction} className="space-y-4">
                {createState?.error && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                    {createState.error}
                  </div>
                )}
                {createState?.success && (
                  <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm">
                    Room created! Redirecting to room {createState.roomCode}...
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-sm text-slate-400">You'll get a room code that you can share with your friend</p>
                </div>
                <CreateRoomButton />
              </form>
            </CardContent>
          </Card>

          {/* Join Room */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Join Room
              </CardTitle>
              <CardDescription className="text-slate-400">Enter a room code to join your friend's game</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={handleJoinAction} className="space-y-4">
                {joinState?.error && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                    {joinState.error}
                  </div>
                )}
                {joinState?.success && (
                  <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm">
                    Joined room! Redirecting to room {joinState.roomCode}...
                  </div>
                )}
                <div className="space-y-2">
                  <label htmlFor="roomCode" className="block text-sm font-medium text-slate-300">
                    Room Code
                  </label>
                  <Input
                    id="roomCode"
                    name="roomCode"
                    type="text"
                    placeholder="Enter 6-character code"
                    required
                    maxLength={6}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 uppercase"
                    onChange={(e) => {
                      e.target.value = e.target.value.toUpperCase()
                    }}
                  />
                </div>
                <JoinRoomButton />
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">How to Play Multiplayer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-400">
            <div className="flex items-start space-x-3">
              <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                1
              </div>
              <p>Create a room to get a 6-character room code</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <p>Share the room code with your friend</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                3
              </div>
              <p>Your friend joins using the room code</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                4
              </div>
              <p>Play tic-tac-toe together in real-time!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
