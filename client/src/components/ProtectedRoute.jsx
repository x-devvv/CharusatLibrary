import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }){
  const { user, loading, initialized } = useAuth()
  
  // Wait for auth to be initialized
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" replace />
}
