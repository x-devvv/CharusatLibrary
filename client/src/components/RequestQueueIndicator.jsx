import { useState, useEffect } from 'react'
import { Loader2, Clock } from 'lucide-react'

export default function RequestQueueIndicator() {
  const [isVisible, setIsVisible] = useState(false)
  const [queueSize, setQueueSize] = useState(0)

  useEffect(() => {
    // Listen for queue events
    const handleQueueStart = () => {
      setIsVisible(true)
      setQueueSize(1)
    }

    const handleQueueUpdate = (event) => {
      setQueueSize(event.detail.size)
      if (event.detail.size === 0) {
        setIsVisible(false)
      }
    }

    const handleQueueEnd = () => {
      setIsVisible(false)
      setQueueSize(0)
    }

    window.addEventListener('queueStart', handleQueueStart)
    window.addEventListener('queueUpdate', handleQueueUpdate)
    window.addEventListener('queueEnd', handleQueueEnd)

    return () => {
      window.removeEventListener('queueStart', handleQueueStart)
      window.removeEventListener('queueUpdate', handleQueueUpdate)
      window.removeEventListener('queueEnd', handleQueueEnd)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-3">
        <div className="flex items-center">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin mr-2" />
          <div className="text-sm text-blue-700">
            <span className="font-medium">Processing requests</span>
            {queueSize > 1 && (
              <span className="ml-1 text-blue-600">
                ({queueSize} in queue)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
