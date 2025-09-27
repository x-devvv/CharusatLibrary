import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { request } from '../lib/api'

export default function ResetPassword(){
  const { token } = useParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      navigate('/login')
    }
  }, [token, navigate])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function onSubmit(e){
    e.preventDefault()
    setError('')
    setSuccess('')
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
      await request(`/auth/reset-password/${token}`, { 
        method: 'POST', 
        body: JSON.stringify({ password: formData.password }) 
      })
      
      setSuccess('Password reset successful! You can now sign in with your new password.')
      setFormData({ password: '', confirmPassword: '' })
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)
      
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
          <p className="text-gray-300 mt-2">Enter your new password</p>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-6 bg-gray-900/80 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 p-8">
          <h2 className="text-2xl font-semibold text-center text-white">Set New Password</h2>
          
          {error && (
            <div className="rounded-md border border-red-400 bg-red-900/30 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
          
          {success && (
            <div className="rounded-md border border-green-400 bg-green-900/30 p-4 text-sm text-green-200">
              {success}
              <div className="mt-2 text-xs">Redirecting to login page...</div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-200">New Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={formData.password} 
              onChange={e=>handleChange('password', e.target.value)} 
              required 
              className="h-12"
              placeholder="Enter your new password (min 6 characters)"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-200">Confirm New Password</Label>
            <Input 
              id="confirmPassword" 
              type="password" 
              value={formData.confirmPassword} 
              onChange={e=>handleChange('confirmPassword', e.target.value)} 
              required 
              className="h-12"
              placeholder="Confirm your new password"
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={loading || success}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Resetting Password...
              </div>
            ) : success ? (
              'Password Reset Successfully!'
            ) : (
              'Reset Password'
            )}
          </Button>
          
          <div className="text-center">
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 text-sm">
              ← Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
