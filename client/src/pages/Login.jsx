import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { request, setToken } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function Login(){
  const nav = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function onSubmit(e){
    e.preventDefault(); setError(''); setLoading(true)
    try{
      const res = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      setToken(res.data.token)
      localStorage.setItem('refresh_token', res.data.refreshToken)
      localStorage.setItem('user_name', res.data.user?.name || '')
      
      // Update user state immediately after login using the context method
      login(res.data.user)
      
      nav('/books')
    }catch(err){ setError(err.message) }
    finally{ setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full mx-4 relative z-10 max-h-screen"
      >
        {/* Header with Charusat Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-16"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center m-0 p-0"
          >
            <img 
              src="./src/assets/charusat-logo.png" 
              alt="Charusat University" 
              className="h-60 w-auto object-contain m-0 p-0"
            />
          </motion.div>
          <p className="text-gray-400 text-lg m-0 p-0 -mt-12 leading-none">Sign in to access your library account</p>
        </motion.div>
        
        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-700/50 shadow-2xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-semibold text-center text-white">
                Welcome Back
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-lg border border-red-400/50 bg-red-900/30 p-4 text-sm text-red-200 backdrop-blur-sm"
                  >
                    {error}
                  </motion.div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-200 font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={e=>setEmail(e.target.value)} 
                      required 
                      className="h-12 pl-10 bg-gray-800/50 border-gray-600 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder:text-gray-400"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-200 font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      value={password} 
                      onChange={e=>setPassword(e.target.value)} 
                      required 
                      className="h-12 pl-10 pr-10 bg-gray-800/50 border-gray-600 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder:text-gray-400"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-12 btn-primary font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
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
                  <Link 
                    to="/forgot-password" 
                    className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    Forgot your password?
                  </Link>
                  
                  <div className="text-center text-sm text-gray-300">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                      Sign up here
                    </Link>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
