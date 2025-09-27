import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { request } from '../lib/api'
import { Button } from '../components/ui/button'
import { useAuth } from '../hooks/useAuth'
import reservationService from '../services/reservationService'
import { 
  Calendar, Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw, 
  ArrowLeft, User, BookOpen, History, MapPin, Phone, Mail, Hash,
  Check, X, AlertCircle, Ban
} from 'lucide-react'

export default function ReservationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [reservation, setReservation] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  const isAdminOrLibrarian = user?.role === 'admin' || user?.role === 'librarian'
  const isOwner = reservation?.userId?._id === user?._id

  useEffect(() => {
    if (id) {
      loadReservation()
    }
  }, [id])

  async function loadReservation() {
    setLoading(true)
    try {
      const response = await reservationService.getReservation(id)
      setReservation(response.data?.reservation)
      setError('')
    } catch (e) {
      setError(e.message)
    }
    finally {
      setLoading(false)
    }
  }

  async function handleFulfillReservation() {
    setActionLoading(prev => ({ ...prev, fulfill: true }))
    try {
      await reservationService.updateReservation(id, { status: 'fulfilled' })
      setSuccess('Reservation fulfilled successfully')
      loadReservation()
    } catch (e) {
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, fulfill: false }))
    }
  }

  async function handleCancelReservation() {
    setActionLoading(prev => ({ ...prev, cancel: true }))
    try {
      await reservationService.cancelReservation(id)
      setSuccess('Reservation cancelled successfully')
      loadReservation()
    } catch (e) {
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, cancel: false }))
    }
  }

  async function handleUpdateStatus(newStatus) {
    setActionLoading(prev => ({ ...prev, update: true }))
    try {
      await reservationService.updateReservation(id, { status: newStatus })
      setSuccess(`Reservation ${newStatus} successfully`)
      loadReservation()
    } catch (e) {
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, update: false }))
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getStatusBadge(status) {
    const statusInfo = reservationService.formatReservationStatus(status)
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
        <span className="mr-1">{statusInfo.icon}</span>
        {statusInfo.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-600 mt-2">Loading reservation details...</p>
        </div>
      </div>
    )
  }

  if (error && !reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Reservation Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => navigate(-1)} className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No reservation data available</p>
        </div>
      </div>
    )
  }

  const isExpired = reservationService.isExpired(reservation.expirationDate)
  const daysUntilExpiration = reservationService.getDaysUntilExpiration(reservation.expirationDate)
  const priority = reservationService.getPriorityLevel(reservation.createdAt)
  const canFulfill = reservationService.canFulfill(reservation)
  const canCancel = reservationService.canCancel(reservation, user.role, user._id)

  return (
    <div className="max-w-4xl mx-auto pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reservation Details</h1>
            <p className="text-gray-600">Reservation ID: {reservation._id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(reservation.status)}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-md border border-red-400 bg-red-50 p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md border border-green-400 bg-green-50 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expiration Warning */}
      {reservation.status === 'pending' && isExpired && (
        <div className="rounded-md border border-red-400 bg-red-50 p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">
                This reservation has expired and may be automatically cancelled.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Book Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {reservation.bookId?.title || 'Unknown Book'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Author:</span> {reservation.bookId?.author || 'Unknown'}
                  </div>
                  <div>
                    <span className="font-medium">Genre:</span> {reservation.bookId?.genre || 'Unknown'}
                  </div>
                  <div>
                    <span className="font-medium">ISBN:</span> {reservation.bookId?.isbn || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Publisher:</span> {reservation.bookId?.publisher || 'Unknown'}
                  </div>
                  <div>
                    <span className="font-medium">Available Copies:</span> {reservation.bookId?.availableCopies || 0}
                  </div>
                  <div>
                    <span className="font-medium">Total Copies:</span> {reservation.bookId?.totalCopies || 0}
                  </div>
                </div>
                {reservation.bookId?.description && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-700">{reservation.bookId.description}</p>
                  </div>
                )}
                <div className="mt-4">
                  <Link to={`/books/${reservation.bookId?._id}`}>
                    <Button size="sm" variant="outline" className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      View Book Details
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Reservation Timeline */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <History className="h-5 w-5 mr-2" />
              Reservation Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-1 bg-blue-100 rounded-full">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Reservation Created</p>
                  <p className="text-xs text-gray-500">{formatDate(reservation.createdAt)}</p>
                </div>
              </div>
              
              {reservation.fulfilledAt && (
                <div className="flex items-start space-x-3">
                  <div className="p-1 bg-green-100 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Reservation Fulfilled</p>
                    <p className="text-xs text-gray-500">{formatDate(reservation.fulfilledAt)}</p>
                  </div>
                </div>
              )}
              
              {reservation.cancelledAt && (
                <div className="flex items-start space-x-3">
                  <div className="p-1 bg-red-100 rounded-full">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Reservation Cancelled</p>
                    <p className="text-xs text-gray-500">{formatDate(reservation.cancelledAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Information */}
          {isAdminOrLibrarian && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                User Information
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <p className="text-gray-900">{reservation.userId?.name || 'Unknown'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <p className="text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {reservation.userId?.email || 'Unknown'}
                  </p>
                </div>
                {reservation.userId?.phone && (
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>
                    <p className="text-gray-900 flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {reservation.userId.phone}
                    </p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Role:</span>
                  <p className="text-gray-900 capitalize">{reservation.userId?.role || 'Unknown'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Reservation Details */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Hash className="h-5 w-5 mr-2" />
              Reservation Details
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <p className="text-gray-900">{formatDate(reservation.createdAt)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Expires:</span>
                <p className={`${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDate(reservation.expirationDate)}
                </p>
              </div>
              {reservation.fulfilledAt && (
                <div>
                  <span className="font-medium text-gray-700">Fulfilled:</span>
                  <p className="text-gray-900">{formatDate(reservation.fulfilledAt)}</p>
                </div>
              )}
              {reservation.position && (
                <div>
                  <span className="font-medium text-gray-700">Queue Position:</span>
                  <p className="text-gray-900">#{reservation.position}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Priority:</span>
                <p className={`font-medium ${priority.color}`}>{priority.label}</p>
              </div>
            </div>
          </div>

          {/* Status Information */}
          {reservation.status === 'pending' && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Status Information
              </h3>
              <div className="space-y-3">
                {isExpired ? (
                  <div className="flex items-center text-red-600">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    <div>
                      <p className="font-medium">Expired</p>
                      <p className="text-sm">Expired {Math.abs(daysUntilExpiration)} days ago</p>
                    </div>
                  </div>
                ) : daysUntilExpiration <= 1 ? (
                  <div className="flex items-center text-yellow-600">
                    <Clock className="h-5 w-5 mr-2" />
                    <div>
                      <p className="font-medium">Expires Soon</p>
                      <p className="text-sm">
                        Expires {daysUntilExpiration === 0 ? 'today' : 'tomorrow'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <div>
                      <p className="font-medium">Active</p>
                      <p className="text-sm">Expires in {daysUntilExpiration} days</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {(isAdminOrLibrarian || isOwner) && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                {isAdminOrLibrarian && canFulfill && (
                  <Button
                    onClick={handleFulfillReservation}
                    disabled={actionLoading.fulfill}
                    className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700"
                  >
                    {actionLoading.fulfill ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Fulfill Reservation
                  </Button>
                )}
                
                {isAdminOrLibrarian && reservation.status === 'pending' && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus('expired')}
                    disabled={actionLoading.update}
                    className="w-full flex items-center justify-center border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                  >
                    {actionLoading.update ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2" />
                    )}
                    Mark as Expired
                  </Button>
                )}
                
                {canCancel && (
                  <Button
                    variant="outline"
                    onClick={handleCancelReservation}
                    disabled={actionLoading.cancel}
                    className="w-full flex items-center justify-center border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {actionLoading.cancel ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Cancel Reservation
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
