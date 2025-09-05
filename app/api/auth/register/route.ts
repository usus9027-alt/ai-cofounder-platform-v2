import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { database } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (authData.user) {
      const user = await database.createUser({
        id: authData.user.id,
        email: authData.user.email!,
        name: name || null,
      })

      if (!user) {
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: authData.user,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
