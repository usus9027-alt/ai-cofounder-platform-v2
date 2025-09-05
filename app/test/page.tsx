'use client'

import React, { useState } from 'react'

export default function TestPage() {
  const [healthStatus, setHealthStatus] = useState<object | null>(null)
  const [chatResponse, setChatResponse] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testHealth = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealthStatus(data)
    } catch (error) {
      console.error('Health check failed:', error)
      setHealthStatus({ error: 'Failed to fetch health status' })
    }
  }

  const testChat = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Hello AI! Can you create a simple text object on the canvas?',
          conversationHistory: [],
          projectId: 'test-project'
        })
      })
      const data = await response.json()
      setChatResponse(data.response || data.error || 'No response')
    } catch (error) {
      console.error('Chat test failed:', error)
      setChatResponse('Failed to get chat response')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">AI Co-founder Platform - API Test</h1>
        
        <div className="space-y-6">
          {/* Health Check Test */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Health Check Test</h2>
            <button
              onClick={testHealth}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Test Health Endpoint
            </button>
            {healthStatus && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <pre className="text-sm">{JSON.stringify(healthStatus, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Chat API Test */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Chat API Test</h2>
            <button
              onClick={testChat}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Chat API'}
            </button>
            {chatResponse && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-medium mb-2">AI Response:</h3>
                <p className="text-sm">{chatResponse}</p>
              </div>
            )}
          </div>

          {/* Environment Variables Check */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
            <div className="space-y-2 text-sm">
              <div>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</div>
              <div>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
