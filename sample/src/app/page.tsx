'use client'

import { useState, useRef, useEffect } from 'react'

interface DraggableItem {
  id: string
  x: number
  y: number
  width: number
  height: number
  type: 'button' | 'card' | 'input' | 'badge' | 'toggle' | 'dropdown'
  content: string
  definition: string
}

export default function Home() {
  const [items, setItems] = useState<DraggableItem[]>([])
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    const radius = 350 // Increased radius for wider spacing

    const getCircularPosition = (index: number, total: number, itemWidth: number, itemHeight: number) => {
      const angle = (index / total) * 2 * Math.PI - Math.PI / 2
      const randomRadius = radius + (Math.random() - 0.5) * 100
      const randomAngle = angle + (Math.random() - 0.5) * 0.3

      return {
        x: centerX + Math.cos(randomAngle) * randomRadius - itemWidth / 2,
        y: centerY + Math.sin(randomAngle) * randomRadius - itemHeight / 2
      }
    }

    const componentsData = [
      { width: 120, height: 40, type: 'button' as const, content: 'Primary', definition: 'Button.tsx' },
      { width: 200, height: 150, type: 'card' as const, content: 'Card Component', definition: 'Card.tsx' },
      { width: 180, height: 36, type: 'input' as const, content: 'Input Field', definition: 'Input.tsx' },
      { width: 80, height: 28, type: 'badge' as const, content: 'Badge', definition: 'Badge.tsx' },
      { width: 60, height: 32, type: 'toggle' as const, content: '', definition: 'Toggle.tsx' },
      { width: 140, height: 36, type: 'dropdown' as const, content: 'Dropdown', definition: 'Dropdown.tsx' },
    ]

    const randomItems: DraggableItem[] = componentsData.map((component, index) => {
      const position = getCircularPosition(index, componentsData.length, component.width, component.height)
      return {
        id: String(index + 1),
        ...component,
        ...position
      }
    })

    setItems(randomItems)
  }, [])

  const handleMouseDown = (e: React.MouseEvent, itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    setDragging(itemId)
    setDragOffset({
      x: e.clientX - item.x,
      y: e.clientY - item.y
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging) return

    setItems(prev => prev.map(item => {
      if (item.id === dragging) {
        return {
          ...item,
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        }
      }
      return item
    }))
  }

  const handleMouseUp = () => {
    setDragging(null)
  }

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, dragOffset])

  const renderComponent = (item: DraggableItem) => {
    const baseClasses = "absolute select-none cursor-move transition-all hover:shadow-xl hover:scale-105"
    const floatingAnimation = dragging === item.id ? '' : 'animate-float'

    switch (item.type) {
      case 'button':
        return (
          <div
            key={item.id}
            className={`${baseClasses} ${floatingAnimation} group`}
            style={{
              left: item.x,
              top: item.y,
              width: item.width,
              height: item.height,
              animationDelay: `${parseInt(item.id) * 0.2}s`
            }}
            onMouseDown={(e) => handleMouseDown(e, item.id)}
          >
            <div className="absolute -top-5 left-0 text-[10px] text-neutral-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {item.definition}
            </div>
            <div className="w-full h-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center font-medium">
              {item.content}
            </div>
          </div>
        )
      case 'card':
        return (
          <div
            key={item.id}
            className={`${baseClasses} ${floatingAnimation} group`}
            style={{
              left: item.x,
              top: item.y,
              width: item.width,
              height: item.height,
              animationDelay: `${parseInt(item.id) * 0.2}s`
            }}
            onMouseDown={(e) => handleMouseDown(e, item.id)}
          >
            <div className="absolute -top-5 left-0 text-[10px] text-neutral-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {item.definition}
            </div>
            <div className="w-full h-full bg-neutral-800/90 backdrop-blur border border-neutral-700 rounded-xl p-4">
              <div className="text-white font-medium mb-2">{item.content}</div>
              <div className="text-neutral-400 text-sm">Drag to move</div>
            </div>
          </div>
        )
      case 'input':
        return (
          <div
            key={item.id}
            className={`${baseClasses} ${floatingAnimation} group`}
            style={{
              left: item.x,
              top: item.y,
              width: item.width,
              height: item.height,
              animationDelay: `${parseInt(item.id) * 0.2}s`
            }}
            onMouseDown={(e) => handleMouseDown(e, item.id)}
          >
            <div className="absolute -top-5 left-0 text-[10px] text-neutral-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {item.definition}
            </div>
            <div className="w-full h-full bg-neutral-800/90 backdrop-blur border border-neutral-600 rounded-lg px-3 flex items-center text-neutral-300">
              {item.content}
            </div>
          </div>
        )
      case 'badge':
        return (
          <div
            key={item.id}
            className={`${baseClasses} ${floatingAnimation} group`}
            style={{
              left: item.x,
              top: item.y,
              width: item.width,
              height: item.height,
              animationDelay: `${parseInt(item.id) * 0.2}s`
            }}
            onMouseDown={(e) => handleMouseDown(e, item.id)}
          >
            <div className="absolute -top-5 left-0 text-[10px] text-neutral-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {item.definition}
            </div>
            <div className="w-full h-full bg-green-500/20 backdrop-blur border border-green-500/50 text-green-400 rounded-full flex items-center justify-center text-sm font-medium">
              {item.content}
            </div>
          </div>
        )
      case 'toggle':
        return (
          <div
            key={item.id}
            className={`${baseClasses} ${floatingAnimation} group`}
            style={{
              left: item.x,
              top: item.y,
              width: item.width,
              height: item.height,
              animationDelay: `${parseInt(item.id) * 0.2}s`
            }}
            onMouseDown={(e) => handleMouseDown(e, item.id)}
          >
            <div className="absolute -top-5 left-0 text-[10px] text-neutral-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {item.definition}
            </div>
            <div className="w-full h-full bg-neutral-700 rounded-full p-1">
              <div className="bg-white rounded-full w-6 h-6"></div>
            </div>
          </div>
        )
      case 'dropdown':
        return (
          <div
            key={item.id}
            className={`${baseClasses} ${floatingAnimation} group`}
            style={{
              left: item.x,
              top: item.y,
              width: item.width,
              height: item.height,
              animationDelay: `${parseInt(item.id) * 0.2}s`
            }}
            onMouseDown={(e) => handleMouseDown(e, item.id)}
          >
            <div className="absolute -top-5 left-0 text-[10px] text-neutral-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {item.definition}
            </div>
            <div className="w-full h-full bg-neutral-800/90 backdrop-blur border border-neutral-600 rounded-lg px-3 flex items-center justify-between text-neutral-300">
              <span>{item.content}</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-neutral-950 to-purple-900/20" />
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Grid Pattern */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      >
        {items.map(renderComponent)}
      </div>

      {/* Instructions - Now as inspectable component */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        <div className="text-center p-8 rounded-2xl" data-component="InstructionsPanel">
          <h1 className="text-2xl font-semibold text-neutral-300 mb-6 tracking-tight">
            Explore <span className="font-mono bg-neutral-900/80 backdrop-blur px-2 py-1 rounded text-blue-400">{'<VibeTorchInspector />'}</span>
          </h1>
          <div className="text-neutral-600 text-sm space-y-1">
            <div>Press <span className="text-neutral-500 font-mono bg-neutral-900/80 backdrop-blur px-1.5 py-0.5 rounded">Option</span> to activate inspector</div>
            <div>→ Click component to select</div>
            <div>→ Press <span className="text-neutral-500 font-mono bg-neutral-900/80 backdrop-blur px-1.5 py-0.5 rounded">Enter</span> to copy</div>
          </div>
        </div>
      </div>

      {/* Top Left Title */}
      <div className="absolute top-4 left-4 z-10">
        <div className="text-neutral-500 text-xs font-medium tracking-wide">VIBETORCH INSPECTOR PLAYGROUND</div>
      </div>
    </main>
  )
}