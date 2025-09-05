import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'
import { database } from '@/lib/database'
import { pineconeIndex } from '@/lib/pinecone'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
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

    await database.createMessage({
      user_id: user.id,
      content: message,
      role: 'user',
    })

    const systemPrompt = `You are an AI co-founder assistant helping entrepreneurs with business ideas and planning. You can:
1. Answer questions about business, entrepreneurship, and strategy
2. Create visual objects on a canvas to help illustrate ideas
3. Provide recommendations based on conversation history

When you want to create objects on the canvas, use this format in your response:
[CANVAS_CREATE:type:data]

Available canvas object types:
- text: [CANVAS_CREATE:text:{"text":"Your text here","x":100,"y":100,"fontSize":16,"fill":"#000000"}]
- rect: [CANVAS_CREATE:rect:{"width":100,"height":50,"x":100,"y":100,"fill":"#3b82f6","stroke":"#1e40af"}]
- circle: [CANVAS_CREATE:circle:{"radius":50,"x":100,"y":100,"fill":"#10b981","stroke":"#059669"}]
- arrow: [CANVAS_CREATE:line:{"x1":50,"y1":50,"x2":150,"y2":150,"stroke":"#ef4444","strokeWidth":3}]

Be helpful, creative, and use canvas objects to visualize concepts when appropriate.`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      max_tokens: 1000,
      temperature: 0.7,
    })

    const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    await database.createMessage({
      user_id: user.id,
      content: aiResponse,
      role: 'assistant',
    })

    const canvasCommands = aiResponse.match(/\[CANVAS_CREATE:([^:]+):({[^}]+})\]/g)
    const createdObjects = []

    if (canvasCommands) {
      for (const command of canvasCommands) {
        const match = command.match(/\[CANVAS_CREATE:([^:]+):({[^}]+})\]/)
        if (match) {
          const [, objectType, objectDataStr] = match
          try {
            const objectData = JSON.parse(objectDataStr)
            const canvasObject = await database.createCanvasObject({
              user_id: user.id,
              object_data: objectData,
              object_type: objectType,
            })
            if (canvasObject) {
              createdObjects.push(canvasObject)
            }
          } catch (parseError) {
            console.error('Error parsing canvas object data:', parseError)
          }
        }
      }
    }

    try {
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: message,
      })

      await pineconeIndex.upsert([
        {
          id: `${user.id}-${Date.now()}`,
          values: embedding.data[0].embedding,
          metadata: {
            userId: user.id,
            content: message,
            response: aiResponse,
            timestamp: new Date().toISOString(),
          },
        },
      ])
    } catch (pineconeError) {
      console.error('Pinecone error:', pineconeError)
    }

    const cleanResponse = aiResponse.replace(/\[CANVAS_CREATE:[^:]+:{[^}]+}\]/g, '').trim()

    return NextResponse.json({
      success: true,
      response: cleanResponse,
      canvasObjects: createdObjects,
    })
  } catch (error) {
    console.error('Chat error:', error)
    
    const fallbackResponse = "I'm sorry, I'm currently experiencing technical difficulties. Please try again in a moment. In the meantime, I'd be happy to help you think through your business ideas when I'm back online."
    
    return NextResponse.json({
      success: true,
      response: fallbackResponse,
      canvasObjects: [],
    })
  }
}
