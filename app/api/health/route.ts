import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { pineconeIndex } from '@/lib/pinecone'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function GET() {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    services: {
      supabase: 'unknown',
      openai: 'unknown',
      pinecone: 'unknown',
    },
    overall: 'unknown',
  }

  try {
    if (!supabase) {
      healthStatus.services.supabase = 'error'
    } else {
      const { error } = await supabase.from('users').select('count').limit(1)
      healthStatus.services.supabase = error ? 'error' : 'healthy'
    }
  } catch {
    healthStatus.services.supabase = 'error'
  }

  try {
    await openai.models.list()
    healthStatus.services.openai = 'healthy'
  } catch {
    healthStatus.services.openai = 'error'
  }

  try {
    await pineconeIndex.describeIndexStats()
    healthStatus.services.pinecone = 'healthy'
  } catch {
    healthStatus.services.pinecone = 'error'
  }

  const allHealthy = Object.values(healthStatus.services).every(status => status === 'healthy')
  const anyError = Object.values(healthStatus.services).some(status => status === 'error')
  
  healthStatus.overall = allHealthy ? 'healthy' : anyError ? 'degraded' : 'unknown'

  const statusCode = healthStatus.overall === 'healthy' ? 200 : 503

  return NextResponse.json(healthStatus, { status: statusCode })
}
