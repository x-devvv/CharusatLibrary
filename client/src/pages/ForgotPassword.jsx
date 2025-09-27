import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { request } from '../lib/api'

export default function ForgotPassword(){
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e){
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try{
      await request('/auth/forgot-password', { 
        method: 'POST', 
        body: JSON.stringify({ email }) 
      })
      
      setSuccess('Password reset instructions have been sent to your email address.')
      setEmail('')
    }catch(err){ 
      setError(err.message) 
    }
    finally{ 
      setLoading(false) 
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-indigo-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.414-6.414a6 6 0 015.743-7.743z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Reset Password</h1>
          <p className="text-gray-300 mt-2">Enter your email to receive reset instructions</p>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-6 bg-gray-900/80 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 p-8">
          <h2 className="text-2xl font-semibold text-center text-white">Forgot Password</h2>
          
          {error && (
            <div className="rounded-md border border-red-400 bg-red-900/30 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
          
          {success && (
            <div className="rounded-md border border-green-400 bg-green-900/30 p-4 text-sm text-green-200">
              {success}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-200">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={e=>setEmail(e.target.value)} 
              required 
              className="h-12"
              placeholder="Enter your email address"
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Sending Instructions...
              </div>
            ) : (
              'Send Reset Instructions'
            )}
          </Button>
          
          <div className="text-center space-y-2">
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 text-sm">
              ← Back to Sign In
            </Link>
            
            <div className="text-center text-sm text-gray-300">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Sign up here
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
