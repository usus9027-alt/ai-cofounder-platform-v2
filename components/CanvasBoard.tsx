'use client'

import { useEffect, useRef } from 'react'
import { fabric } from 'fabric'

export default function CanvasBoard({ projectId }: { projectId?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)

  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
        width: window.innerWidth * 0.66,
        height: window.innerHeight,
        backgroundColor: '#fafafa'
      })

      // Добавляем начальный текст
      const welcomeText = new fabric.Text('Canvas Board - нарисуйте вашу идею!', {
        left: 50,
        top: 50,
        fontSize: 20,
        fill: '#999'
      })
      fabricCanvasRef.current.add(welcomeText)
    }

    return () => {
      fabricCanvasRef.current?.dispose()
    }
  }, [])

  return (
    <div className="w-full h-full bg-gray-50">
      <canvas ref={canvasRef} />
    </div>
  )
}