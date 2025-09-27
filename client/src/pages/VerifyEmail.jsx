import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { request } from '../lib/api'

export default function VerifyEmail(){
  const { token } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link')
      setLoading(false)
      return
    }

    verifyEmail()
  }, [token])

  async function verifyEmail() {
    try {
      const response = await request(`/auth/verify-email/${token}`)
      setStatus('success')
      setMessage(response.message || 'Email verified successfully!')
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)
      
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Email verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className={`h-12 w-12 rounded-lg mx-auto mb-4 flex items-center justify-center ${
            status === 'success' ? 'bg-green-600' : 
            status === 'error' ? 'bg-red-600' : 
            'bg-indigo-600'
          }`}>
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : status === 'success' ? (
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : status === 'error' ? (
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white">
            {loading ? 'Verifying Email...' : 
             status === 'success' ? 'Email Verified!' : 
             'Verification Failed'}
          </h1>
          <p className="text-gray-300 mt-2">
            {loading ? 'Please wait while we verify your email address' : message}
          </p>
        </div>
        
        <div className="bg-gray-900/80 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 p-8 text-center">
          {status === 'success' && (
            <div className="space-y-4">
              <div className="text-green-200 text-sm">
                Your email has been successfully verified! You can now access all features of your account.
              </div>
              <div className="text-xs text-gray-400">
                Redirecting to login page in 3 seconds...
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-red-200 text-sm">
                {message}
              </div>
              <div className="text-xs text-gray-400">
                The verification link may be expired or invalid. Please try requesting a new verification email.
              </div>
            </div>
          )}
          
          {loading && (
            <div className="text-gray-300 text-sm">
              Processing your verification request...
            </div>
          )}
          
          <div className="mt-6 space-y-2">
            <Link to="/login">
              <Button className="w-full btn-primary">
                Go to Login
              </Button>
            </Link>
            
            {status === 'error' && (
              <Link to="/register" className="block">
                <Button variant="secondary" className="w-full">
                  Create New Account
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
