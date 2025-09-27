import { useState, useCallback } from 'react'

export function useErrorHandler() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleError = useCallback((error) => {
    console.error('Error caught by useErrorHandler:', error)
    
    // Handle different types of errors
    if (error.message?.includes('Too many requests')) {
      setError('Rate limited: Please wait a moment before trying again.')
    } else if (error.message?.includes('Network Error') || error.message?.includes('Failed to fetch')) {
      setError('Network error: Please check your connection and try again.')
    } else if (error.message?.includes('Session expired')) {
      setError('Your session has expired. Please log in again.')
    } else if (error.message?.includes('Unauthorized')) {
      setError('You are not authorized to perform this action.')
    } else if (error.message?.includes('Not Found')) {
      setError('The requested resource was not found.')
    } else {
      setError(error.message || 'An unexpected error occurred.')
    }
  }, [])

  const clearError = useCallback(() => {
    setError('')
  }, [])

  const executeWithErrorHandling = useCallback(async (asyncFunction) => {
    setIsLoading(true)
    clearError()
    
    try {
      const result = await asyncFunction()
      return result
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [handleError, clearError])

  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeWithErrorHandling
  }
}
