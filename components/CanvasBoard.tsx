'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import { CanvasObject } from '@/lib/database'

interface CanvasBoardProps {
  userId: string
  newObjects?: CanvasObject[]
}

export default function CanvasBoard({ userId, newObjects = [] }: CanvasBoardProps) {
  console.log('CanvasBoard component rendering with userId:', userId)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [objectCount, setObjectCount] = useState(0)

  const initializeFabricCanvas = useCallback(() => {
    if (fabricCanvasRef.current) {
      console.log('Fabric canvas already initialized')
      return fabricCanvasRef.current
    }

    if (!canvasRef.current) {
      console.log('Canvas ref not available for initialization')
      return null
    }

    try {
      console.log('Initializing Fabric.js canvas...')
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 400,
        backgroundColor: '#ffffff'
      })

      fabricCanvasRef.current = fabricCanvas
      console.log('Fabric.js canvas initialized successfully')
      return fabricCanvas
    } catch (error) {
      console.error('Failed to initialize Fabric.js canvas:', error)
      return null
    }
  }, [])

  const renderCanvasObject = useCallback((obj: CanvasObject, fabricCanvas: fabric.Canvas) => {
    console.log('Rendering canvas object:', obj.object_type, obj.object_data)
    
    try {
      if (obj.object_type === 'rect') {
        const rect = new fabric.Rect({
          left: obj.object_data.x || 0,
          top: obj.object_data.y || 0,
          width: obj.object_data.width || 100,
          height: obj.object_data.height || 60,
          fill: obj.object_data.fill || '#3b82f6',
          stroke: obj.object_data.stroke || '#1e40af',
          strokeWidth: 2
        })
        fabricCanvas.add(rect)
        console.log('Added rectangle to canvas')
      } else if (obj.object_type === 'circle') {
        const circle = new fabric.Circle({
          left: obj.object_data.x || 0,
          top: obj.object_data.y || 0,
          radius: obj.object_data.radius || 30,
          fill: obj.object_data.fill || '#3b82f6',
          stroke: obj.object_data.stroke || '#1e40af',
          strokeWidth: 2
        })
        fabricCanvas.add(circle)
        console.log('Added circle to canvas')
      } else if (obj.object_type === 'text') {
        const text = new fabric.Text(String(obj.object_data.text || 'Text'), {
          left: obj.object_data.x || 0,
          top: obj.object_data.y || 0,
          fontSize: obj.object_data.fontSize || 16,
          fill: obj.object_data.fill || '#000000'
        })
        fabricCanvas.add(text)
        console.log('Added text to canvas')
      }
    } catch (error) {
      console.error('Error rendering canvas object:', error)
    }
  }, [])

  const loadCanvasObjects = useCallback(async () => {
    console.log('loadCanvasObjects called for user:', userId)
    try {
      console.log('Attempting to load canvas objects from database...')
      
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: objects, error } = await supabase
        .from('canvas_objects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Supabase error loading canvas objects:', error)
        setError(`Failed to load canvas objects: ${error.message}`)
        setIsLoading(false)
        return
      }
      
      console.log('Successfully loaded canvas objects:', objects?.length || 0)
      console.log('Canvas objects data:', objects)
      
      const fabricCanvas = fabricCanvasRef.current
      if (!fabricCanvas) {
        console.error('Fabric canvas not initialized yet')
        setError('Canvas not ready')
        setIsLoading(false)
        return
      }

      fabricCanvas.clear()
      
      if (objects) {
        objects.forEach(obj => {
          renderCanvasObject(obj, fabricCanvas)
        })
      }
      
      fabricCanvas.renderAll()
      setObjectCount(objects?.length || 0)
      setIsLoading(false)
      console.log('Canvas loading completed with', objects?.length || 0, 'objects')
    } catch (error) {
      console.error('Error loading canvas objects:', error)
      setError(`Failed to load canvas objects: ${error}`)
      setIsLoading(false)
    }
  }, [userId, renderCanvasObject])

  const clearCanvas = useCallback(async () => {
    console.log('clearCanvas called')
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear()
      fabricCanvasRef.current.renderAll()
      setObjectCount(0)
    }
    
  }, [])

  useEffect(() => {
    console.log('Canvas useEffect triggered with userId:', userId)
    
    let retryCount = 0
    const maxRetries = 10
    
    const initCanvas = () => {
      console.log(`Attempting to initialize canvas... (attempt ${retryCount + 1}/${maxRetries})`)
      console.log('Canvas ref current:', canvasRef.current)
      console.log('Canvas ref current type:', typeof canvasRef.current)
      
      if (canvasRef.current) {
        console.log('Canvas element found, initializing Fabric.js...')
        const fabricCanvas = initializeFabricCanvas()
        if (fabricCanvas) {
          console.log('Canvas initialized successfully, loading objects...')
          loadCanvasObjects()
          return
        }
      }
      
      retryCount++
      if (retryCount < maxRetries) {
        console.log(`Canvas ref not ready, retrying in 300ms... (${retryCount}/${maxRetries})`)
        setTimeout(initCanvas, 300)
      } else {
        console.error('Failed to initialize canvas after maximum retries')
        setError('Failed to initialize canvas - element not found')
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(initCanvas, 200)

    return () => {
      clearTimeout(timeoutId)
      console.log('Canvas useEffect cleanup')
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose()
        fabricCanvasRef.current = null
      }
    }
  }, [userId, initializeFabricCanvas, loadCanvasObjects])

  useEffect(() => {
    console.log('newObjects useEffect triggered with objects:', newObjects.length)
    if (newObjects.length > 0 && fabricCanvasRef.current) {
      newObjects.forEach(obj => {
        renderCanvasObject(obj, fabricCanvasRef.current!)
      })
      fabricCanvasRef.current.renderAll()
      setObjectCount(prev => prev + newObjects.length)
    }
  }, [newObjects, renderCanvasObject])

  console.log('CanvasBoard render - isLoading:', isLoading, 'error:', error, 'objectCount:', objectCount)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Canvas Board</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{objectCount} objects</span>
          <button
            onClick={clearCanvas}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
          >
            Clear Canvas
          </button>
        </div>
      </div>
      
      <div className="border border-gray-300 rounded p-4 bg-gray-50">
        {error ? (
          <div className="text-red-500 p-4">Canvas Error: {error}</div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-96 text-gray-500">Loading canvas...</div>
        ) : null}
        <canvas
          ref={canvasRef}
          className="block border border-gray-200 bg-white"
          style={{ display: error ? 'none' : 'block' }}
        />
      </div>
    </div>
  )
}
