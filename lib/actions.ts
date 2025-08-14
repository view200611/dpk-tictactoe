"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

// Sign in with email and password
export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    // Sign in directly with email and password - no database lookup needed
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (authError) {
      console.error("Auth error:", authError)
      return { error: "Invalid email or password" }
    }

    redirect("/dashboard")
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Sign up with username, email, and password
export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const username = formData.get("username")
  const email = formData.get("email")
  const password = formData.get("password")
  const confirmPassword = formData.get("confirmPassword")

  if (!username || !email || !password || !confirmPassword) {
    return { error: "All fields are required" }
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    // Check if username already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("username")
      .eq("username", username.toString())
      .single()

    if (existingUser) {
      return { error: "Username already taken" }
    }

    // Create auth user first
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard`,
      },
    })

    if (authError) {
      console.error("Auth error:", authError)
      return { error: authError.message }
    }

    if (authData.user && !authData.user.identities?.length) {
      return { error: "User already exists with this email" }
    }

    // Create user profile with retry logic
    if (authData.user) {
      let retries = 3
      let profileError = null

      while (retries > 0) {
        const { error } = await supabase.from("users").insert({
          id: authData.user.id,
          email: email.toString(),
          username: username.toString(),
          wins: 0,
          draws: 0,
          losses: 0,
          total_score: 0,
        })

        if (!error) {
          profileError = null
          break
        }

        profileError = error
        retries--

        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second before retry
        }
      }

      if (profileError) {
        console.error("Profile creation error:", profileError)
        // Don't fail registration if profile creation fails - we can create it later during login
        console.log("Profile creation failed, but auth user created successfully")
      }
    }

    return { success: "Account created successfully! You can now sign in." }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })
  await supabase.auth.signOut()
  redirect("/auth/login")
}
