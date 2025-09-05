'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { database, CanvasObject } from '@/lib/database'
import { User } from '@supabase/supabase-js'
import Header from '@/components/layout/Header'
import AuthForm from '@/components/AuthForm'
import CanvasBoard from '@/components/CanvasBoard'
import Recommendations from '@/components/Recommendations'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [newCanvasObjects, setNewCanvasObjects] = useState<CanvasObject[]>([])

  const checkUser = useCallback(async () => {
    console.log('checkUser starting')
    try {
      const supabase = getSupabaseClient()
      console.log('supabase client:', !!supabase)
      if (!supabase) {
        console.log('No supabase, setting demo user')
        setUser({
          id: '0d0e8dc3-0a4d-48e4-8de3-12db7ecc4e10',
          email: 'test@example.com',
          user_metadata: { name: 'Demo User' }
        } as unknown as User)
        setLoading(false)
        return
      }
      
      try {
        console.log('Getting session...')
        
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout after 10 seconds')), 10000)
        )
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: { user?: User } | null } }
        console.log('Session result:', !!session?.user)
        if (session?.user) {
          console.log('Setting real user')
          setUser(session.user)
          console.log('Loading messages for user:', session.user.id)
          await loadMessages(session.user.id)
        } else {
          console.log('No session, setting demo user')
          setUser({
            id: '0d0e8dc3-0a4d-48e4-8de3-12db7ecc4e10',
            email: 'test@example.com',
            user_metadata: { name: 'Demo User' }
          } as unknown as User)
        }
      } catch (sessionError) {
        console.error('Session error, using demo user:', sessionError)
        setUser({
          id: '0d0e8dc3-0a4d-48e4-8de3-12db7ecc4e10',
          email: 'test@example.com',
          user_metadata: { name: 'Demo User' }
        } as unknown as User)
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setUser({
        id: '0d0e8dc3-0a4d-48e4-8de3-12db7ecc4e10',
        email: 'test@example.com',
        user_metadata: { name: 'Demo User' }
      } as unknown as User)
    } finally {
      console.log('checkUser finished, setting loading false')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkUser()
    
    const supabase = getSupabaseClient()
    let subscription = { unsubscribe: () => {} }
    
    if (supabase) {
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
        async (event: string, session: { user?: User } | null) => {
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(session.user)
            await loadMessages(session.user.id)
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
            setMessages([])
          }
        }
      )
      subscription = authSubscription
    }

    return () => subscription.unsubscribe()
  }, [checkUser])

  const loadMessages = async (userId: string) => {
    try {
      const userMessages = await database.getMessages(userId)
      const formattedMessages = userMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
      setMessages(formattedMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleAuthSuccess = (authUser: User) => {
    setUser(authUser)
  }

  const handleLogout = () => {
    setUser(null)
    setMessages([])
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !user || chatLoading) return

    console.log('handleSendMessage starting')
    setChatLoading(true)
    const userMessage = message
    setMessage('')

    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)

    try {
      console.log('Making chat API call...')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer demo-token`,
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          projectId: 'default',
          userId: user.id,
        }),
      })

      console.log('Chat API response status:', response.status)
      const data = await response.json()
      console.log('Chat API response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Chat request failed')
      }

      if (data.success) {
        setMessages([...newMessages, { role: 'assistant', content: data.response }])
        
        if (data.canvasObjects && data.canvasObjects.length > 0) {
          setNewCanvasObjects(data.canvasObjects)
          setTimeout(() => setNewCanvasObjects([]), 1000)
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }])
    } finally {
      console.log('handleSendMessage finished')
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chat Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                AI Co-founder Assistant
              </h2>
              
              <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
                {messages.length === 0 ? (
                  <div className="text-gray-500 text-center">
                    <p>Welcome! I&apos;m your AI co-founder assistant.</p>
                    <p className="mt-2">Ask me about business ideas, strategy, or anything entrepreneurship-related!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-blue-100 ml-8'
                            : 'bg-white mr-8 border border-gray-200'
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-600 mb-1">
                          {msg.role === 'user' ? 'You' : 'AI Assistant'}
                        </div>
                        <div className="text-gray-900 whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask me about your business ideas..."
                  disabled={chatLoading}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !message.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {chatLoading ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>

            <Recommendations userId={user.id} authToken={''} />
          </div>

          {/* Canvas Section */}
          <div>
            <CanvasBoard userId={user.id} newObjects={newCanvasObjects} />
          </div>
        </div>
      </main>
    </div>
  )
}
