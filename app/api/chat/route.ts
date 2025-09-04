import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [], projectId = 'default' } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        response: "Отличная идея! Давайте обсудим детали вашего проекта.",
        success: false 
      })
    }

    const systemPrompt = `Ты - AI-кофаундер, эксперт по стартапам.
Помогаешь развивать идеи от концепции до запуска.
Отвечай кратко, конкретно, на русском языке.`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-5).map((msg: any) => ({
        role: msg.isAI ? 'assistant' : 'user',
        content: msg.text
      })),
      { role: 'user', content: message }
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages as any,
      max_tokens: 300,
      temperature: 0.7,
    })

    return NextResponse.json({
      response: completion.choices[0]?.message?.content || 'Продолжайте!',
      success: true
    })

  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json({
      response: "Интересная идея! Расскажите подробнее о вашей целевой аудитории.",
      success: false
    })
  }
}