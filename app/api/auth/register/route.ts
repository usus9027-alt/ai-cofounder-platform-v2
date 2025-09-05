import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (authData.user) {
      try {
        console.log('Creating user profile for:', authData.user.id, authData.user.email)
        
        const { data: user, error: userError } = await supabaseAdmin!
          .from('users')
          .insert({
            id: authData.user.id,
            email: authData.user.email!,
            name: name || null,
          })
          .select()
          .single()

        console.log('User creation result:', user)

        if (userError) {
          console.error('Supabase admin createUser error:', userError)
          return NextResponse.json(
            { error: 'Failed to create user profile' },
            { status: 500 }
          )
        }

        if (!user) {
          console.error('Database createUser returned null')
          return NextResponse.json(
            { error: 'Failed to create user profile' },
            { status: 500 }
          )
        }
      } catch (dbError) {
        console.error('Database error during user creation:', dbError)
        return NextResponse.json(
          { error: 'Database error during user creation' },
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
