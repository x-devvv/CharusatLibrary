import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { request } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../hooks/useAuth'
import reservationService from '../services/reservationService'
import { 
  Calendar, Clock, AlertTriangle, CheckCircle, XCircle, RefreshCw, 
  Eye, Search, BookOpen, Plus, Ban, AlertCircle, X, Library, 
  TrendingUp, Shield, Award, User, Hash
} from 'lucide-react'

export default function Reservations(){
  const { user } = useAuth()
  const [myReservations, setMyReservations] = useState([])
  const [availableBooks, setAvailableBooks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  const [viewMode, setViewMode] = useState('my-reservations')
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [selectedBook, setSelectedBook] = useState(null)

  useEffect(() => { 
    loadMyReservations()
    if (viewMode === 'reserve-books') {
      loadAvailableBooks()
    }
  }, [viewMode])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (viewMode === 'reserve-books') loadAvailableBooks()
    }, 300)
    return () => clearTimeout(delayedSearch)
  }, [searchQuery])

  async function loadMyReservations() {
    if (!user?._id) {
      console.log('User not authenticated, skipping reservations load')
      return
    }
    setLoading(true)
    try {
      const response = await reservationService.getUserReservations(user._id)
      setMyReservations(response.data?.reservations || [])
      setError('')
    } catch (e) {
      console.error('My reservations load error:', e)
      setError(e.message)
    }
    finally {
      setLoading(false)
    }
  }

  async function loadAvailableBooks() {
    setLoading(true)
    try {
      const response = await request('/books')
      const books = response.data?.books || []
      // Filter books that are currently unavailable (good candidates for reservation)
      const unavailable = books.filter(book => 
        (book.status === 'unavailable' || book.availableCopies === 0) &&
        (!searchQuery || 
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.genre.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
      setAvailableBooks(unavailable)
      setError('')
    } catch (e) {
      console.error('Available books load error:', e)
      setError(e.message)
    }
    finally {
      setLoading(false)
    }
  }

  async function handleCreateReservation(bookId) {
    setActionLoading(prev => ({ ...prev, [bookId]: 'reserving' }))
    try {
      await reservationService.createReservation({ bookId })
      setSuccess('Book reserved successfully!')
      loadMyReservations()
      loadAvailableBooks()
      setShowReserveModal(false)
      setSelectedBook(null)
    } catch (e) {
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, [bookId]: null }))
    }
  }

  async function handleCancelReservation(reservationId) {
    setActionLoading(prev => ({ ...prev, [reservationId]: 'cancelling' }))
    try {
      await reservationService.cancelReservation(reservationId)
      setSuccess('Reservation cancelled successfully!')
      loadMyReservations()
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
      day: 'numeric'
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

  function getExpirationInfo(expirationDate, status) {
    if (status !== 'pending') return null
    
    const daysUntilExpiration = reservationService.getDaysUntilExpiration(expirationDate)
    const isExpired = reservationService.isExpired(expirationDate)
    
    if (isExpired) {
      return (
        <div className="flex items-center text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4 mr-1" />
          Expired
        </div>
      )
    } else if (daysUntilExpiration <= 1) {
      return (
        <div className="flex items-center text-yellow-400 text-sm">
          <Clock className="h-4 w-4 mr-1" />
          Expires {daysUntilExpiration === 0 ? 'today' : 'tomorrow'}
        </div>
      )
    }
    return (
      <div className="flex items-center text-gray-400 text-sm">
        <Calendar className="h-4 w-4 mr-1" />
        Expires in {daysUntilExpiration} days
      </div>
    )
  }

  const ReservationCard = ({ reservation }) => {
    const canCancel = reservationService.canCancel(reservation, user.role, user._id)
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated border-gray-700/30"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-purple-500/20 rounded-lg">
                  <BookOpen className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {reservation.bookId?.title || 'Unknown Book'}
                  </h3>
                  <p className="text-gray-300 text-sm">
                    by {reservation.bookId?.author || 'Unknown Author'}
                  </p>
                </div>
              </div>
              <div className="bg-gray-800/50 p-2 rounded-lg mb-3">
                <div className="text-xs text-gray-300">
                  <span className="font-semibold text-gray-200">ISBN:</span> {reservation.bookId?.isbn || 'N/A'}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              {getStatusBadge(reservation.status)}
              {getExpirationInfo(reservation.expirationDate, reservation.status)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-gray-300 mb-4">
            <div className="bg-gray-800/30 p-2 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3 text-green-400" />
                <span className="font-semibold text-gray-200 text-xs">Reserved:</span>
              </div>
              <div className="text-white text-sm">{formatDate(reservation.createdAt)}</div>
            </div>
            <div className="bg-gray-800/30 p-2 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3 text-yellow-400" />
                <span className="font-semibold text-gray-200 text-xs">Expires:</span>
              </div>
              <div className="text-white text-sm">{formatDate(reservation.expirationDate)}</div>
            </div>
            {reservation.fulfilledAt && (
              <div className="bg-gray-800/30 p-2 rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="h-3 w-3 text-green-400" />
                  <span className="font-semibold text-gray-200 text-xs">Fulfilled:</span>
                </div>
                <div className="text-white text-sm">{formatDate(reservation.fulfilledAt)}</div>
              </div>
            )}
            {reservation.position && (
              <div className="bg-gray-800/30 p-2 rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-blue-400" />
                  <span className="font-semibold text-gray-200 text-xs">Position:</span>
                </div>
                <div className="text-white text-sm">#{reservation.position}</div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {canCancel && reservation.status === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCancelReservation(reservation._id)}
                disabled={actionLoading[reservation._id] === 'cancelling'}
                className="flex items-center border-red-400/50 text-red-400 hover:bg-red-900/20"
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
              <Button size="sm" variant="outline" className="btn-secondary flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                Details
              </Button>
            </Link>
            
            <Link to={`/books/${reservation.bookId?._id}`}>
              <Button size="sm" variant="outline" className="btn-secondary flex items-center">
                <BookOpen className="h-4 w-4 mr-1" />
                View Book
              </Button>
            </Link>
          </div>
        </CardContent>
      </motion.div>
    )
  }

  const BookCard = ({ book }) => {
    // Check if user already has a reservation for this book
    const hasReservation = myReservations.some(r => 
      r.bookId?._id === book._id && (r.status === 'pending' || r.status === 'fulfilled')
    )

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated border-gray-700/30 group hover:scale-[1.02] transition-all duration-300"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-red-500/20 rounded-lg">
                  <BookOpen className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-gray-300 text-sm">by {book.author}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {book.genre}
                </Badge>
                <Badge variant="destructive" className="text-xs px-2 py-0.5">
                  <Ban className="h-3 w-3 mr-1" />
                  Unavailable
                </Badge>
              </div>
              <div className="bg-gray-800/50 p-2 rounded-lg mb-3">
                <div className="text-xs text-gray-300">
                  <span className="font-semibold text-gray-200">Available:</span> {book.availableCopies} copies
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Link to={`/books/${book._id}`}>
              <Button size="sm" variant="outline" className="btn-secondary flex items-center text-xs px-3 py-1">
                <Eye className="h-3 w-3 mr-1" />
                View Details
              </Button>
            </Link>
            
            {hasReservation ? (
              <Button size="sm" disabled className="flex items-center text-xs px-3 py-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                Already Reserved
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleCreateReservation(book._id)}
                disabled={actionLoading[book._id] === 'reserving'}
                className="btn-primary flex items-center text-xs px-3 py-1"
              >
                {actionLoading[book._id] === 'reserving' ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3 mr-1" />
                )}
                Reserve Book
              </Button>
            )}
          </div>
        </CardContent>
      </motion.div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto pt-4 space-y-4 min-w-[900px]">
      {/* Professional Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white">My Reservations</h1>
          <p className="text-lg text-gray-300">Manage your book reservations and reserve new books</p>
        </div>
        <Button 
          onClick={() => {
            if (viewMode === 'my-reservations') {
              loadMyReservations()
            } else {
              loadAvailableBooks()
            }
          }} 
          disabled={loading}
          variant="outline"
          className="btn-secondary flex items-center"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </motion.div>

      {/* Enhanced View Mode Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg w-fit">
          <button
            onClick={() => setViewMode('my-reservations')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              viewMode === 'my-reservations' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Library className="h-4 w-4" />
            My Reservations
          </button>
          <button
            onClick={() => setViewMode('reserve-books')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              viewMode === 'reserve-books' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Plus className="h-4 w-4" />
            Reserve Books
          </button>
        </div>
      </motion.div>

      {/* Enhanced Alerts */}
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-lg border border-red-400/50 bg-red-900/30 p-4 text-sm text-red-200 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-400 mr-3" />
            <span>{error}</span>
          </div>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-lg border border-green-400/50 bg-green-900/30 p-4 text-sm text-green-200 backdrop-blur-sm"
        >
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
            <span>{success}</span>
          </div>
        </motion.div>
      )}

      {/* Enhanced Search for Reserve Books */}
      {viewMode === 'reserve-books' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search unavailable books by title, author, or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 input-field"
            />
          </div>
        </motion.div>
      )}

      {/* Enhanced Content */}
      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-gray-400 mt-4 text-lg">Loading...</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {viewMode === 'my-reservations' && (
            <>
              {myReservations.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="max-w-md mx-auto">
                    <BookOpen className="h-16 w-16 mx-auto text-gray-600 mb-6" />
                    <h3 className="text-2xl font-semibold text-gray-300 mb-4">No Reservations Found</h3>
                    <p className="text-gray-400 mb-6">You haven't reserved any books yet.</p>
                    <Button 
                      className="btn-primary" 
                      onClick={() => setViewMode('reserve-books')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Reserve Books
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {myReservations.map((reservation, index) => (
                    <motion.div
                      key={reservation._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ReservationCard reservation={reservation} />
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {viewMode === 'reserve-books' && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-4"
              >
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-300">About Reservations</h3>
                    <p className="text-sm text-blue-200 mt-1">
                      You can reserve books that are currently unavailable. When the book becomes available, 
                      you'll be notified and have a limited time to borrow it.
                    </p>
                  </div>
                </div>
              </motion.div>

              {availableBooks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="max-w-md mx-auto">
                    <CheckCircle className="h-16 w-16 mx-auto text-green-400 mb-6" />
                    <h3 className="text-2xl font-semibold text-gray-300 mb-4">All Books Available!</h3>
                    <p className="text-gray-400 mb-6">
                      {searchQuery ? 'Try adjusting your search terms or check the main books page.' : 'No books need reservations right now.'}
                    </p>
                    <Link to="/books">
                      <Button className="btn-primary">
                        Browse Available Books
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableBooks.map((book, index) => (
                    <motion.div
                      key={book._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <BookCard book={book} />
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}