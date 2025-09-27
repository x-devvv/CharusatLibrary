import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { request } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useAuth } from '../hooks/useAuth'
import reservationService from '../services/reservationService'
import { 
  Calendar, Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw, 
  Eye, Search, Filter, Download, BookOpen, User, Mail, Phone,
  AlertCircle, Ban, Check, X, Grid, List, Bookmark
} from 'lucide-react'

export default function ManageReservations(){
  const { user } = useAuth()
  const [reservations, setReservations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  const isAdminOrLibrarian = user?.role === 'admin' || user?.role === 'librarian'

  useEffect(() => { 
    loadReservations()
  }, [statusFilter])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadReservations()
    }, 300)
    return () => clearTimeout(delayedSearch)
  }, [searchQuery])

  async function loadReservations() { 
    setLoading(true)
    try { 
      const params = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (searchQuery) params.search = searchQuery
      
      const response = await reservationService.getAllReservations(params)
      let allReservations = response.data?.reservations || []
      
      setReservations(allReservations)
      setError('')
    } catch (e) { 
      console.error('Reservations load error:', e)
      setError(e.message) 
    }
    finally {
      setLoading(false)
    }
  }

  async function handleFulfillReservation(reservationId) {
    setActionLoading(prev => ({ ...prev, [reservationId]: 'fulfilling' }))
    try {
      await reservationService.updateReservation(reservationId, { status: 'fulfilled' })
      setSuccess('Reservation fulfilled successfully')
      loadReservations()
    } catch (e) {
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, [reservationId]: null }))
    }
  }

  async function handleCancelReservation(reservationId) {
    setActionLoading(prev => ({ ...prev, [reservationId]: 'cancelling' }))
    try {
      await reservationService.cancelReservation(reservationId)
      setSuccess('Reservation cancelled successfully')
      loadReservations()
    } catch (e) {
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, [reservationId]: null }))
    }
  }

  async function handleUpdateStatus(reservationId, newStatus) {
    setActionLoading(prev => ({ ...prev, [reservationId]: 'updating' }))
    try {
      await reservationService.updateReservation(reservationId, { status: newStatus })
      setSuccess(`Reservation ${newStatus} successfully`)
      loadReservations()
    } catch (e) {
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, [reservationId]: null }))
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getStatusBadge(status) {
    const statusInfo = reservationService.formatReservationStatus(status)
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
        <span className="mr-1">{statusInfo.icon}</span>
        {statusInfo.label}
      </span>
    )
  }

  function getPriorityBadge(createdAt) {
    const priority = reservationService.getPriorityLevel(createdAt)
    return (
      <span className={`text-xs font-medium ${priority.color}`}>
        {priority.label}
      </span>
    )
  }

  function getExpirationInfo(expirationDate, status) {
    if (status !== 'pending') return null
    
    const daysUntilExpiration = reservationService.getDaysUntilExpiration(expirationDate)
    const isExpired = reservationService.isExpired(expirationDate)
    
    if (isExpired) {
      return (
        <div className="flex items-center text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4 mr-1" />
          Expired
        </div>
      )
    } else if (daysUntilExpiration <= 1) {
      return (
        <div className="flex items-center text-yellow-600 text-sm">
          <Clock className="h-4 w-4 mr-1" />
          Expires {daysUntilExpiration === 0 ? 'today' : 'tomorrow'}
        </div>
      )
    }
    return (
      <div className="flex items-center text-gray-600 text-sm">
        <Calendar className="h-4 w-4 mr-1" />
        Expires in {daysUntilExpiration} days
      </div>
    )
  }

  const ReservationCard = ({ reservation }) => (
    <div className="card p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {reservation.bookId?.title || 'Unknown Book'}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            by {reservation.bookId?.author || 'Unknown Author'}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Reserved by: {reservation.userId?.name || 'Unknown User'} ({reservation.userId?.email})
          </p>
          {reservation.userId?.phone && (
            <p className="text-sm text-gray-600 flex items-center">
              <Phone className="h-4 w-4 mr-1" />
              {reservation.userId.phone}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end space-y-2">
          {getStatusBadge(reservation.status)}
          {getPriorityBadge(reservation.createdAt)}
          {getExpirationInfo(reservation.expirationDate, reservation.status)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
        <div>
          <span className="font-medium">Reserved:</span> {formatDate(reservation.createdAt)}
        </div>
        <div>
          <span className="font-medium">Expires:</span> {formatDate(reservation.expirationDate)}
        </div>
        {reservation.fulfilledAt && (
          <div>
            <span className="font-medium">Fulfilled:</span> {formatDate(reservation.fulfilledAt)}
          </div>
        )}
        {reservation.position && (
          <div>
            <span className="font-medium">Queue Position:</span> #{reservation.position}
          </div>
        )}
      </div>

      {isAdminOrLibrarian && (
        <div className="flex flex-wrap gap-2">
          {reservation.status === 'pending' && reservationService.canFulfill(reservation) && (
            <Button
              size="sm"
              onClick={() => handleFulfillReservation(reservation._id)}
              disabled={actionLoading[reservation._id] === 'fulfilling'}
              className="flex items-center bg-green-600 hover:bg-green-700"
            >
              {actionLoading[reservation._id] === 'fulfilling' ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Fulfill
            </Button>
          )}
          
          {reservation.status === 'pending' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUpdateStatus(reservation._id, 'expired')}
              disabled={actionLoading[reservation._id] === 'updating'}
              className="flex items-center border-yellow-300 text-yellow-600 hover:bg-yellow-50"
            >
              {actionLoading[reservation._id] === 'updating' ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-1" />
              )}
              Mark Expired
            </Button>
          )}
          
          {(reservation.status === 'pending' || reservation.status === 'expired') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCancelReservation(reservation._id)}
              disabled={actionLoading[reservation._id] === 'cancelling'}
              className="flex items-center border-red-300 text-red-600 hover:bg-red-50"
            >
              {actionLoading[reservation._id] === 'cancelling' ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-1" />
              )}
              Cancel
            </Button>
          )}
          
          <Link to={`/reservations/${reservation._id}`}>
            <Button size="sm" variant="outline" className="flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              Details
            </Button>
          </Link>
        </div>
      )}
    </div>
  )

  const StatsCard = ({ title, count, icon: Icon, color = "blue" }) => (
    <div className={`card p-6`}>
      <div className="flex items-center">
        <div className={`p-2 rounded-lg bg-${color}-100 mr-4`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{count}</p>
        </div>
      </div>
    </div>
  )

  // Calculate stats
  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    fulfilled: reservations.filter(r => r.status === 'fulfilled').length,
    expired: reservations.filter(r => r.status === 'expired').length
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 min-w-[1000px]">
      {/* Professional Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold text-white">
              Reservation Management
            </h1>
            <p className="text-xl text-gray-300 font-medium">
              Comprehensive oversight of library book reservations and queue management
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Live Queue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Real-time Updates</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Smart Prioritization</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <Card className="card-elevated border-gray-700/30">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500/20 rounded-lg mr-4">
                <BookOpen className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Total Reservations</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated border-gray-700/30">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-500/20 rounded-lg mr-4">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated border-gray-700/30">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-500/20 rounded-lg mr-4">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Fulfilled</p>
                <p className="text-2xl font-bold text-white">{stats.fulfilled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated border-gray-700/30">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-500/20 rounded-lg mr-4">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Expired</p>
                <p className="text-2xl font-bold text-white">{stats.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerts */}
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-red-500/10 rounded-xl blur-sm"></div>
          <div className="relative bg-red-900/20 backdrop-blur-sm border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-200">{error}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-green-500/10 rounded-xl blur-sm"></div>
          <div className="relative bg-green-900/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-200">{success}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Professional Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="card-elevated border-gray-700/30">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-white text-xl font-semibold">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Filter className="h-5 w-5 text-blue-400" />
              </div>
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-8 md:grid-cols-2">
              {/* Enhanced Search */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-200 font-semibold text-base">Search Reservations</Label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" />
                    <Input
                      type="text"
                      placeholder="Search by book title, user name, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-4 py-3 bg-gray-900/50 border-gray-600/50 text-gray-200 placeholder-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Enhanced Filters */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-200 font-semibold text-base">Filter Options</Label>
                </div>
                <div className="grid gap-4">
                  <div className="flex items-center space-x-3">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">Status:</span>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-gray-900/50 border-gray-600/50 text-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200 min-w-[140px]">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600 rounded-lg">
                        <SelectItem value="all" className="text-base py-3">All Status</SelectItem>
                        <SelectItem value="pending" className="text-base py-3">Pending</SelectItem>
                        <SelectItem value="fulfilled" className="text-base py-3">Fulfilled</SelectItem>
                        <SelectItem value="expired" className="text-base py-3">Expired</SelectItem>
                        <SelectItem value="cancelled" className="text-base py-3">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Header */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-between items-center"
      >
        <div>
          <h2 className="text-2xl font-semibold text-white">All Reservations</h2>
          <p className="text-gray-400 text-sm mt-1">
            {reservations.length} reservation{reservations.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="btn-primary"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="btn-secondary"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Reservation List */}
      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-gray-800/20 to-gray-700/20 rounded-2xl blur-sm"></div>
          <div className="relative bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-12">
            <div className="text-center space-y-4">
              <div className="relative">
                <RefreshCw className="h-12 w-12 mx-auto text-blue-400 animate-spin" />
                <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-lg"></div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-200">Loading reservations...</p>
                <p className="text-sm text-gray-400">Please wait while we fetch the latest data</p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {reservations.length === 0 ? (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-800/20 to-gray-700/20 rounded-2xl blur-sm"></div>
              <div className="relative bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-12">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center">
                      <Bookmark className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="absolute inset-0 bg-gray-400/10 rounded-full blur-lg"></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-200">No reservations found</p>
                    <p className="text-sm text-gray-400">Try adjusting your search criteria or filters</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            reservations.map((reservation, index) => (
              <motion.div
                key={reservation._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ReservationCard reservation={reservation} />
              </motion.div>
            ))
          )}
        </motion.div>
      )}
    </div>
  )
}
