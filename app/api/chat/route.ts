import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSupabaseAdmin } from '@/lib/supabase'
import { database } from '@/lib/database'
import { pineconeIndex } from '@/lib/pinecone'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    console.log('Chat API called')
    const { message, conversationHistory, userId } = await request.json()
    console.log('Received message:', message)
    console.log('User ID:', userId)

    if (!message) {
      console.log('No message provided')
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('authorization')
    console.log('Auth header present:', !!authHeader)
    if (!authHeader) {
      console.log('No authorization header')
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted:', token)
    
    let user: { id: string; email: string }
    
    if (token === 'demo-token') {
      console.log('Using demo user')
      user = {
        id: userId || '0d0e8dc3-0a4d-48e4-8de3-12db7ecc4e10',
        email: 'demo@example.com'
      }
    } else {
      const supabaseAdmin = getSupabaseAdmin()
      if (!supabaseAdmin) {
        console.log('Supabase admin client not available')
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        )
      }
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

      if (authError || !authUser) {
        console.log('Auth error:', authError)
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        )
      }
      user = { id: authUser.id, email: authUser.email || '' }
    }

    console.log('User authenticated:', user.id)

    await database.createMessage({
      user_id: user.id,
      content: message,
      role: 'user',
    })

    const systemPrompt = `You are an AI co-founder assistant helping entrepreneurs. When users ask for visual elements like diagrams, charts, rectangles, or business models, respond normally but also include special Canvas commands.

Use this EXACT format for visual elements:
[CANVAS_CREATE:rect:{"width":100,"height":60,"x":100,"y":100,"fill":"#3b82f6","stroke":"#1e40af"}]
[CANVAS_CREATE:text:{"text":"Your text","x":100,"y":50,"fontSize":16,"fill":"#000000"}]
[CANVAS_CREATE:circle:{"radius":30,"x":200,"y":150,"fill":"#10b981","stroke":"#059669"}]

Example: "I'll create 3 rectangles for you. [CANVAS_CREATE:rect:{"width":100,"height":60,"x":50,"y":50,"fill":"#3b82f6","stroke":"#1e40af"}] [CANVAS_CREATE:rect:{"width":100,"height":60,"x":200,"y":50,"fill":"#10b981","stroke":"#059669"}] [CANVAS_CREATE:rect:{"width":100,"height":60,"x":350,"y":50,"fill":"#ef4444","stroke":"#dc2626"}]"`

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
    
    console.log('Raw AI response:', aiResponse)
    console.log('AI response length:', aiResponse.length)
    console.log('Looking for Canvas commands in response...')

    await database.createMessage({
      user_id: user.id,
      content: aiResponse,
      role: 'assistant',
    })

    const canvasCommands = aiResponse.match(/\[CANVAS_CREATE:([^:]+):({[^}]+})\]/g)
    console.log('Found Canvas commands:', canvasCommands)
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
    } else {
      const visualKeywords = ['rectangle', 'rect', 'box', 'diagram', 'chart', 'visual', 'canvas', 'draw', 'create', 'shape']
      const messageWords = message.toLowerCase().split(' ')
      const hasVisualRequest = visualKeywords.some((keyword: string) => 
        messageWords.some((word: string) => word.includes(keyword))
      )
      
      if (hasVisualRequest) {
        console.log('Detected visual request, creating fallback Canvas objects')
        
        if (message.toLowerCase().includes('3') && (message.toLowerCase().includes('rectangle') || message.toLowerCase().includes('box'))) {
          console.log('Creating 3 rectangles fallback')
          const rectangles = [
            { width: 100, height: 60, x: 50, y: 100, fill: '#3b82f6', stroke: '#1e40af' },
            { width: 100, height: 60, x: 200, y: 100, fill: '#10b981', stroke: '#059669' },
            { width: 100, height: 60, x: 350, y: 100, fill: '#ef4444', stroke: '#dc2626' }
          ]
          
          for (let i = 0; i < rectangles.length; i++) {
            const rectData = rectangles[i]
            console.log(`Creating rectangle ${i + 1}:`, rectData)
            try {
              const canvasObject = await database.createCanvasObject({
                user_id: user.id,
                object_data: rectData,
                object_type: 'rect',
              })
              console.log(`Rectangle ${i + 1} creation result:`, canvasObject)
              if (canvasObject) {
                createdObjects.push(canvasObject)
                console.log(`Rectangle ${i + 1} added to createdObjects`)
              } else {
                console.log(`Rectangle ${i + 1} creation returned null`)
              }
            } catch (error) {
              console.error(`Error creating rectangle ${i + 1}:`, error)
            }
          }
          console.log('Final createdObjects count:', createdObjects.length)
        } else {
          console.log('Creating general visual objects fallback')
          const objects = []
          
          if (message.toLowerCase().includes('rectangle') || message.toLowerCase().includes('rect')) {
            objects.push({ width: 120, height: 80, x: 100, y: 100, fill: '#3b82f6', stroke: '#1e40af', type: 'rect' })
          }
          
          if (message.toLowerCase().includes('circle')) {
            objects.push({ radius: 40, x: 300, y: 140, fill: '#ef4444', stroke: '#dc2626', type: 'circle' })
          }
          
          if (objects.length === 0) {
            objects.push({ width: 100, height: 60, x: 150, y: 120, fill: '#10b981', stroke: '#059669', type: 'rect' })
          }
          
          for (let i = 0; i < objects.length; i++) {
            const { type: objType, ...cleanObjData } = objects[i]
            console.log(`Creating object ${i + 1} (${objType}):`, cleanObjData)
            try {
              const canvasObject = await database.createCanvasObject({
                user_id: user.id,
                object_data: cleanObjData,
                object_type: objType,
              })
              console.log(`Object ${i + 1} creation result:`, canvasObject)
              if (canvasObject) {
                createdObjects.push(canvasObject)
                console.log(`Object ${i + 1} added to createdObjects`)
              } else {
                console.log(`Object ${i + 1} creation returned null`)
              }
            } catch (error) {
              console.error(`Error creating object ${i + 1}:`, error)
            }
          }
          console.log('Final createdObjects count:', createdObjects.length)
        }
      }
    }

    const cleanResponse = aiResponse.replace(/\[CANVAS_CREATE:[^:]+:{[^}]+}\]/g, '').trim()

    setImmediate(async () => {
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
        console.error('Pinecone error (background, non-blocking):', pineconeError)
      }
    })

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
