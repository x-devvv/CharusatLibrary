import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Profile from './pages/Profile'
import Books from './pages/Books'
import Transactions from './pages/Transactions'
import ProtectedRoute from './components/ProtectedRoute'
import RoleGuard from './components/RoleGuard'
import DashboardLayout from './components/DashboardLayout'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AdminUsers from './pages/AdminUsers'
import UserDetail from './pages/UserDetail'
import Reservations from './pages/Reservations'
import ManageReservations from './pages/ManageReservations'
import ReservationDetail from './pages/ReservationDetail'
import ManageBooks from './pages/ManageBooks'
import ManageTransactions from './pages/ManageTransactions'
import BookDetail from './pages/BookDetail'
import TransactionDetail from './pages/TransactionDetail'
import RateLimitToast from './components/RateLimitToast'
import RequestQueueIndicator from './components/RequestQueueIndicator'
import ErrorBoundary from './components/ErrorBoundary'

function AppContent(){
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#020617] relative">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `radial-gradient(circle 500px at 50% 200px, #3e3e3e, transparent)`,
          }}
        />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#020617] relative">
      {/* Dark Radial Glow Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle 500px at 50% 200px, #3e3e3e, transparent)`,
        }}
      />
      
      <BrowserRouter 
        basename="/app"
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="relative z-10">
          <Routes>
        {/* Public routes */}
        <Route path="/" element={user ? <Navigate to="/books" replace /> : <Login />} />
        <Route path="/login" element={user ? <Navigate to="/books" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/books" replace /> : <Register />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/books" replace /> : <ForgotPassword />} />
        <Route path="/reset-password/:token" element={user ? <Navigate to="/books" replace /> : <ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        
        {/* Protected routes with dashboard layout */}
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Profile />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/books" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Books />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        
        <Route path="/books/:id" element={
          <ProtectedRoute>
            <DashboardLayout>
              <BookDetail />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/transactions/:id" element={
          <ProtectedRoute>
            <DashboardLayout>
              <TransactionDetail />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/transactions" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Transactions />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/reservations" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Reservations />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/reservations/:id" element={
          <ProtectedRoute>
            <DashboardLayout>
              <ReservationDetail />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        {/* Admin/Librarian routes */}
        <Route path="/admin/users" element={
          <ProtectedRoute>
            <RoleGuard user={user} roles={['admin']}>
              <DashboardLayout>
                <AdminUsers />
              </DashboardLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/users/:id" element={
          <ProtectedRoute>
            <RoleGuard user={user} roles={['admin', 'librarian']}>
              <DashboardLayout>
                <UserDetail />
              </DashboardLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        
        
        <Route path="/admin/books" element={
          <ProtectedRoute>
            <RoleGuard user={user} roles={['admin','librarian']}>
              <DashboardLayout>
                <ManageBooks />
              </DashboardLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/transactions" element={
          <ProtectedRoute>
            <RoleGuard user={user} roles={['admin','librarian']}>
              <DashboardLayout>
                <ManageTransactions />
              </DashboardLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/reservations" element={
          <ProtectedRoute>
            <RoleGuard user={user} roles={['admin','librarian']}>
              <DashboardLayout>
                <ManageReservations />
              </DashboardLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
          </Routes>
        </div>
        
        {/* Global UI Components */}
        <RateLimitToast />
        <RequestQueueIndicator />
      </BrowserRouter>
    </div>
  )
}

export default function App(){
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}
