import { Navigate } from 'react-router-dom'

export default function RoleGuard({ user, roles, children }){
  if (!user) return <Navigate to="/login" replace />
  if (!roles || roles.length===0) return children
  return roles.includes(user.role) ? children : <Navigate to="/" replace />
}
