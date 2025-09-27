import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { request, setToken } from '../lib/api'

export default function Register(){
  const nav = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function onSubmit(e){
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try{
      const { confirmPassword, ...registerData } = formData
      const res = await request('/auth/register', { 
        method: 'POST', 
        body: JSON.stringify(registerData) 
      })
      
      setToken(res.data.token)
      localStorage.setItem('refresh_token', res.data.refreshToken)
      localStorage.setItem('user_name', res.data.user?.name || formData.name)
      nav('/dashboard')
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Join Library</h1>
          <p className="text-gray-300 mt-2">Create your account to get started</p>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-6 bg-gray-900/80 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 p-8">
          <h2 className="text-2xl font-semibold text-center text-white">Create Account</h2>
          
          {error && (
            <div className="rounded-md border border-red-400 bg-red-900/30 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-200">Full Name</Label>
            <Input 
              id="name" 
              value={formData.name} 
              onChange={e=>handleChange('name', e.target.value)} 
              required 
              className="h-12"
              placeholder="Enter your full name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-200">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              value={formData.email} 
              onChange={e=>handleChange('email', e.target.value)} 
              required 
              className="h-12"
              placeholder="Enter your email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-200">Phone Number (Optional)</Label>
            <Input 
              id="phone" 
              type="tel" 
              value={formData.phone} 
              onChange={e=>handleChange('phone', e.target.value)} 
              className="h-12"
              placeholder="Enter your phone number"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-200">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={formData.password} 
              onChange={e=>handleChange('password', e.target.value)} 
              required 
              className="h-12"
              placeholder="Create a password (min 6 characters)"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-200">Confirm Password</Label>
            <Input 
              id="confirmPassword" 
              type="password" 
              value={formData.confirmPassword} 
              onChange={e=>handleChange('confirmPassword', e.target.value)} 
              required 
              className="h-12"
              placeholder="Confirm your password"
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
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </Button>
          
          <div className="text-center text-sm text-gray-300">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign in here
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
