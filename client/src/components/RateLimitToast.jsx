import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, X } from 'lucide-react'
import { Button } from './ui/button'

export default function RateLimitToast() {
  const [isVisible, setIsVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [retryAfter, setRetryAfter] = useState(0)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    const handleRateLimit = (event) => {
      const { message: rateLimitMessage, retryAfter: retryAfterSeconds } = event.detail
      setMessage(rateLimitMessage)
      setRetryAfter(retryAfterSeconds)
      setCountdown(retryAfterSeconds)
      setIsVisible(true)
    }

    window.addEventListener('rateLimit', handleRateLimit)
    return () => window.removeEventListener('rateLimit', handleRateLimit)
  }, [])

  useEffect(() => {
    if (!isVisible || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setIsVisible(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isVisible, countdown])

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Rate Limited
            </h3>
            <div className="mt-1 text-sm text-red-700">
              <p>{message}</p>
              {countdown > 0 && (
                <div className="mt-2 flex items-center text-red-600">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Retry in {formatTime(countdown)}</span>
                </div>
              )}
            </div>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
