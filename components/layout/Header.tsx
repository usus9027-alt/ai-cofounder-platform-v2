'use client'

import React from 'react'
import { User } from '@supabase/supabase-js'

interface HeaderProps {
  user: User | null
  onLogout: () => void
}

export default function Header({ user, onLogout }: HeaderProps) {
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
      onLogout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">
            AI Co-founder Platform
          </h1>
        </div>
        
        {user && (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
