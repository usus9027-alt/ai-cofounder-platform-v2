'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import { database, CanvasObject } from '@/lib/database'

interface CanvasBoardProps {
  userId: string
  newObjects?: CanvasObject[]
}

export default function CanvasBoard({ userId, newObjects = [] }: CanvasBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadCanvasObjects = useCallback(async () => {
    try {
      const objects = await database.getCanvasObjects(userId)
      
      if (fabricCanvasRef.current && objects.length > 0) {
        objects.forEach(obj => {
          addObjectToCanvas(obj)
        })
      }
    } catch (error) {
      console.error('Error loading canvas objects:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const addNewObjects = useCallback((objects: CanvasObject[]) => {
    objects.forEach(obj => {
      addObjectToCanvas(obj)
    })
  }, [])

  const addObjectToCanvas = (canvasObject: CanvasObject) => {
    if (!fabricCanvasRef.current) return

    const { object_data, object_type } = canvasObject
    let fabricObject: fabric.Text | fabric.Rect | fabric.Circle | fabric.Line | null = null

    try {
      switch (object_type) {
        case 'text':
          fabricObject = new fabric.Text(String(object_data.text) || 'Text', {
            left: object_data.x || 100,
            top: object_data.y || 100,
            fontSize: object_data.fontSize || 16,
            fill: object_data.fill || '#000000',
          })
          break

        case 'rect':
          fabricObject = new fabric.Rect({
            left: object_data.x || 100,
            top: object_data.y || 100,
            width: object_data.width || 100,
            height: object_data.height || 50,
            fill: object_data.fill || '#3b82f6',
            stroke: object_data.stroke || '#1e40af',
            strokeWidth: 2,
          })
          break

        case 'circle':
          fabricObject = new fabric.Circle({
            left: object_data.x || 100,
            top: object_data.y || 100,
            radius: object_data.radius || 50,
            fill: object_data.fill || '#10b981',
            stroke: object_data.stroke || '#059669',
            strokeWidth: 2,
          })
          break

        case 'line':
          fabricObject = new fabric.Line([
            Number(object_data.x1) || 50,
            Number(object_data.y1) || 50,
            Number(object_data.x2) || 150,
            Number(object_data.y2) || 150,
          ], {
            stroke: object_data.stroke || '#ef4444',
            strokeWidth: object_data.strokeWidth || 3,
          })
          break

        default:
          console.warn('Unknown object type:', object_type)
          return
      }

      if (fabricObject) {
        fabricObject.set('canvasObjectId', canvasObject.id)
        fabricCanvasRef.current.add(fabricObject)
        fabricCanvasRef.current.renderAll()
      }
    } catch (error) {
      console.error('Error adding object to canvas:', error)
    }
  }

  const handleObjectModified = useCallback(async (e: fabric.IEvent) => {
    const obj = e.target
    if (!obj) return

    const canvasObjectId = obj.get('canvasObjectId')
    if (!canvasObjectId) return

    try {
      const updatedData = {
        x: obj.left,
        y: obj.top,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle,
      }

      await database.updateCanvasObject(canvasObjectId, {
        object_data: updatedData,
      })
    } catch (error) {
      console.error('Error updating canvas object:', error)
    }
  }, [])

  const clearCanvas = useCallback(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
    })

    fabricCanvasRef.current = canvas

    loadCanvasObjects()

    canvas.on('object:modified', handleObjectModified)
    canvas.on('object:moved', handleObjectModified)
    canvas.on('object:scaled', handleObjectModified)
    canvas.on('object:rotated', handleObjectModified)

    return () => {
      canvas.dispose()
    }
  }, [userId, loadCanvasObjects, handleObjectModified])

  useEffect(() => {
    if (newObjects.length > 0 && fabricCanvasRef.current) {
      addNewObjects(newObjects)
    }
  }, [newObjects, addNewObjects])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-gray-500">Loading canvas...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Canvas Board</h3>
        <button
          onClick={clearCanvas}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
        >
          Clear Canvas
        </button>
      </div>
      
      <div className="border border-gray-300 rounded">
        <canvas
          ref={canvasRef}
          className="block"
        />
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        Objects are created by AI. You can move, resize, and edit them.
      </p>
    </div>
  )
}
