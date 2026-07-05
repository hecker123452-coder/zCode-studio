'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface SwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number // minimum distance in px
  velocityThreshold?: number // minimum velocity
  enabled?: boolean
}

export function useSwipeGesture({
  onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown,
  threshold = 50,
  velocityThreshold = 0.3,
  enabled = true,
}: SwipeGestureOptions) {
  const startX = useRef(0)
  const startY = useRef(0)
  const startTime = useRef(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return
    const touch = e.touches[0]
    startX.current = touch.clientX
    startY.current = touch.clientY
    startTime.current = Date.now()
    setIsSwiping(true)
  }, [enabled])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !isSwiping) return
    setIsSwiping(false)

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - startX.current
    const deltaY = touch.clientY - startY.current
    const deltaTime = Date.now() - startTime.current
    const velocityX = Math.abs(deltaX) / deltaTime
    const velocityY = Math.abs(deltaY) / deltaTime

    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // Horizontal swipe
    if (absX > absY && absX > threshold) {
      if (deltaX > 0 && velocityX > velocityThreshold) {
        onSwipeRight?.()
      } else if (deltaX < 0 && velocityX > velocityThreshold) {
        onSwipeLeft?.()
      }
    }
    // Vertical swipe
    else if (absY > absX && absY > threshold) {
      if (deltaY > 0 && velocityY > velocityThreshold) {
        onSwipeDown?.()
      } else if (deltaY < 0 && velocityY > velocityThreshold) {
        onSwipeUp?.()
      }
    }
  }, [enabled, isSwiping, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocityThreshold])

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  }
}

// Hook for swipe-to-close on modals/drawers
export function useSwipeToClose(onClose: () => void, direction: 'left' | 'right' | 'down' = 'down', enabled = true) {
  return useSwipeGesture({
    [direction === 'left' ? 'onSwipeLeft' : direction === 'right' ? 'onSwipeRight' : 'onSwipeDown']: onClose,
    threshold: 80,
    velocityThreshold: 0.2,
    enabled,
  })
}
