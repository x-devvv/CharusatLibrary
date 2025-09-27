import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { request, setToken } from '../lib/api'

export default function Login(){
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e){
    e.preventDefault(); setError(''); setLoading(true)
    try{
      const res = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      setToken(res.data.token)
      localStorage.setItem('refresh_token', res.data.refreshToken)
      localStorage.setItem('user_name', res.data.user?.name || '')
      nav('/dashboard')
    }catch(err){ setError(err.message) }
    finally{ setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-indigo-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Library Management</h1>
          <p className="text-gray-300 mt-2">Sign in to access your library account</p>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-6 bg-gray-900/80 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 p-8">
          <h2 className="text-2xl font-semibold text-center text-white">Welcome Back</h2>
          
          {error && (
            <div className="rounded-md border border-red-400 bg-red-900/30 p-4 text-sm text-red-200">
              {error}
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
              placeholder="admin@library.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-200">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              required 
              className="h-12"
              placeholder="Enter your password"
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
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </Button>
          
          <div className="text-center space-y-4">
            <Link to="/forgot-password" className="text-indigo-400 hover:text-indigo-300 text-sm">
              Forgot your password?
            </Link>
            
            <div className="text-center text-sm text-gray-300">
              <p className="mb-2">Demo Accounts:</p>
              <div className="space-y-1 text-xs">
                <p><strong>Admin:</strong> admin@library.com / Admin@123456</p>
                <p><strong>Librarian:</strong> librarian@library.com / Librarian@123456</p>
                <p><strong>Member:</strong> member@library.com / Member@123456</p>
              </div>
            </div>
            
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
