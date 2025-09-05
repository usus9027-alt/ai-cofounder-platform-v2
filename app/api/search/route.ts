import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'
import { pineconeIndex } from '@/lib/pinecone'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const embedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    })

    const searchResults = await pineconeIndex.query({
      vector: embedding.data[0].embedding,
      filter: { userId: user.id },
      topK: limit,
      includeMetadata: true,
    })

    const results = searchResults.matches?.map(match => ({
      id: match.id,
      score: match.score,
      content: match.metadata?.content,
      response: match.metadata?.response,
      timestamp: match.metadata?.timestamp,
    })) || []

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
