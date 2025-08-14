import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Nunito } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
})

export const metadata: Metadata = {
  title: "Tic Tac Toe - Challenge AI & Friends",
  description:
    "Play tic-tac-toe against AI with multiple difficulty levels or challenge friends in multiplayer rooms. Track your stats and climb the leaderboard!",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${nunito.variable} antialiased`}>
      <body className="font-sans bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen">
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  )
}
