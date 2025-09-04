'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import CanvasBoard from '../components/CanvasBoard'
import Recommendations from '../components/Recommendations'
import AuthForm from '../components/AuthForm'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [messages, setMessages] = useState([
    { id: 1, text: "Привет! Я твой AI-кофаундер. Расскажи о своей идее!", isAI: true }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        loadMessages(user.id)
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleAuthSuccess = (userData: any) => {
    setUser(userData)
    loadMessages(userData.id)
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setMessages([{ id: 1, text: "Привет! Я твой AI-кофаундер!", isAI: true }])
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const loadMessages = async (userId?: string) => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (!error && data && data.length > 0) {
        const formattedMessages = data.map(msg => ({
          id: msg.id,
          text: msg.content,
          isAI: msg.role === 'assistant'
        }))
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const saveMessage = async (content: string, role: 'user' | 'assistant') => {
    if (!user) return

    try {
      await supabase
        .from('messages')
        .insert([{
          user_id: user.id,
          content: content,
          role: role,
          created_at: new Date().toISOString()
        }])
    } catch (error) {
      console.error('Error saving message:', error)
    }
  }

  const handleSendMessage = async () => {
    if (inputText.trim() && !isLoading) {
      const currentInput = inputText
      setInputText('')
      setIsLoading(true)

      await saveMessage(currentInput, 'user')
      const userMessage = { id: Date.now(), text: currentInput, isAI: false }
      setMessages(prev => [...prev, userMessage])

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: currentInput,
            conversationHistory: messages,
            projectId: user?.id
          }),
        })

        const data = await response.json()
        const aiResponse = {
          id: Date.now() + 1,
          text: data.response || "Извините, произошла ошибка.",
          isAI: true
        }
        
        await saveMessage(aiResponse.text, 'assistant')
        setMessages(prev => [...prev, aiResponse])

        if (data.recommendations) {
          setRecommendations(data.recommendations)
        }
      } catch (error) {
        console.error('Chat API Error:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  if (isAuthLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-400">Загрузка...</div>
    </div>
  }

  if (!user) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex h-screen">
        <div className="w-1/3 border-r border-gray-100 flex flex-col">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-light text-gray-400">AI Чат</h2>
            <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-700">
              Выйти
            </button>
          </div>

          <div className="flex-1 p-8 overflow-y-auto">
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`${message.isAI ? 'text-gray-600' : 'text-gray-800'}`}>
                  <p className="text-sm leading-relaxed font-light">{message.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 border-t border-gray-50">
            <div className="flex items-center space-x-3 border border-gray-200 rounded-full px-4 py-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Опишите вашу идею..."
                className="flex-1 bg-transparent text-sm font-light focus:outline-none"
              />
              <button onClick={handleSendMessage} disabled={isLoading}>
                {isLoading ? '⏳' : '➤'}
              </button>
            </div>
            <Recommendations
              recommendations={recommendations}
              onSelectRecommendation={(r) => setInputText(r.content)}
            />
          </div>
        </div>

        <div className="w-2/3 flex flex-col">
          <CanvasBoard projectId={user?.id} />
        </div>
      </div>
    </div>
  )
}