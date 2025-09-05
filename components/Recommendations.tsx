'use client'

import React, { useState } from 'react'

interface SearchResult {
  id: string
  score: number
  content: string
  response: string
  timestamp: string
}

interface RecommendationsProps {
  userId: string
  authToken: string
}

export default function Recommendations({ authToken }: RecommendationsProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 5,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Search Previous Conversations
      </h3>
      
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your ideas and conversations..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="text-red-600 text-sm mb-4">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Search Results ({results.length})
          </h4>
          
          {results.map((result) => (
            <div
              key={result.id}
              className="p-3 bg-gray-50 rounded-md border border-gray-200"
            >
              <div className="text-sm text-gray-600 mb-1">
                <strong>You:</strong> {result.content}
              </div>
              <div className="text-sm text-gray-800 mb-2">
                <strong>AI:</strong> {result.response}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(result.timestamp).toLocaleDateString()} • 
                Relevance: {Math.round(result.score * 100)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && searchQuery && !loading && (
        <div className="text-gray-500 text-sm text-center py-4">
          No results found for &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  )
}
