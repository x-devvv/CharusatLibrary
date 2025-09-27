import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { request } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../hooks/useAuth'
import transactionService from '../services/transactionService'
import { 
  Calendar, Clock, DollarSign, AlertTriangle, CheckCircle, XCircle, 
  RefreshCw, Eye, Search, BookOpen, Plus, CreditCard, TrendingUp, 
  Library, User, Shield, ArrowRight, Star, MapPin, Award
} from 'lucide-react'

export default function Transactions(){
  const { user } = useAuth()
  const [activeTransactions, setActiveTransactions] = useState([])
  const [availableBooks, setAvailableBooks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  const [viewMode, setViewMode] = useState('my-transactions')
  const [selectedBook, setSelectedBook] = useState(null)
  const [showBorrowModal, setShowBorrowModal] = useState(false)

  useEffect(() => { 
    if (viewMode === 'my-transactions') {
      loadActiveTransactions()
    } else if (viewMode === 'borrow-books') {
      loadAvailableBooks()
    }
  }, [viewMode, user])

  useEffect(() => {
    if (user?._id) {
      loadActiveTransactions()
    }
  }, [user])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (viewMode === 'borrow-books') loadAvailableBooks()
    }, 300)
    return () => clearTimeout(delayedSearch)
  }, [searchQuery])

  async function loadActiveTransactions() {
    if (!user?._id) {
      console.log('User not authenticated, skipping transactions load')
      return
    }
    setLoading(true)
    try {
      console.log('📚 Loading active transactions for user:', user._id)
      const response = await transactionService.getUserActiveTransactions(user._id)
      console.log('📊 Active transactions response:', response)
      const transactions = response.data?.transactions || []
      console.log('✅ Active transactions found:', transactions.length)
      setActiveTransactions(transactions)
      setError('')
    } catch (e) {
      console.error('❌ Active transactions load error:', e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadAvailableBooks() {
    setLoading(true)
    try {
      console.log('📖 Loading available books...')
      const response = await request('/books')
      const books = response.data?.books || []
      console.log('📊 Total books received:', books.length)
      
      const available = books.filter(book => {
        const isActive = book.isActive !== false
        const hasAvailableCopies = book.availableCopies > 0
        const matchesSearch = !searchQuery || 
          book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (typeof book.authors === 'string' ? book.authors : book.authors?.[0] || '')?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.genre?.toLowerCase().includes(searchQuery.toLowerCase())
        
        return isActive && hasAvailableCopies && matchesSearch
      })
      
      console.log('✅ Available books after filtering:', available.length)
      setAvailableBooks(available)
      setError('')
    } catch (e) {
      console.error('Available books load error:', e)
      setError(e.message)
    }
    finally {
      setLoading(false)
    }
  }

  async function handleBorrowBook(bookId) {
    setActionLoading(prev => ({ ...prev, [bookId]: 'borrowing' }))
    try {
      console.log('📚 Borrowing book:', bookId)
      await transactionService.borrowBook(bookId)
      setSuccess('Book borrowed successfully!')
      
      await loadActiveTransactions()
      await loadAvailableBooks()
      
      setShowBorrowModal(false)
      setSelectedBook(null)
      
      window.dispatchEvent(new CustomEvent('transactionUpdate', { detail: { type: 'borrow', bookId } }))
      console.log('✅ Book borrow process completed')
    } catch (e) {
      console.error('❌ Borrow error:', e)
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, [bookId]: null }))
    }
  }

  async function handleRenewBook(transactionId) {
    setActionLoading(prev => ({ ...prev, [transactionId]: 'renewing' }))
    try {
      await transactionService.renewBook(transactionId)
      setSuccess('Book renewed successfully!')
      loadActiveTransactions()
    } catch (e) {
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, [transactionId]: null }))
    }
  }

  async function handlePayFine(transactionId, amount) {
    setActionLoading(prev => ({ ...prev, [transactionId]: 'paying' }))
    try {
      await transactionService.payFine(transactionId, { amount })
      setSuccess('Fine paid successfully!')
      loadActiveTransactions()
    } catch (e) {
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, [transactionId]: null }))
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
    const statusInfo = transactionService.formatTransactionStatus(status)
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  function getDueDateInfo(dueDate, status) {
    if (status === 'returned') return null
    
    const daysUntilDue = transactionService.getDaysUntilDue(dueDate)
    const isOverdue = transactionService.isOverdue(dueDate)
    
    if (isOverdue) {
      const fine = transactionService.calculateFine(dueDate)
      return (
        <div className="flex items-center text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4 mr-1" />
          {Math.abs(daysUntilDue)} days overdue (${fine} fine)
        </div>
      )
    } else if (daysUntilDue <= 3) {
      return (
        <div className="flex items-center text-yellow-400 text-sm">
          <Clock className="h-4 w-4 mr-1" />
          Due in {daysUntilDue} days
        </div>
      )
    }
    return (
      <div className="flex items-center text-gray-400 text-sm">
        <Calendar className="h-4 w-4 mr-1" />
        Due {formatDate(dueDate)}
      </div>
    )
  }

  const TransactionCard = ({ transaction }) => {
    const isOverdue = transactionService.isOverdue(transaction.dueDate) && transaction.status === 'borrowed'
    const fine = isOverdue ? transactionService.calculateFine(transaction.dueDate) : 0
    const canRenew = transaction.renewalCount < 2 && transaction.status === 'borrowed' && !isOverdue

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
                <div className="p-1.5 bg-blue-500/20 rounded-lg">
                  <BookOpen className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {transaction.bookId?.title || 'Unknown Book'}
                  </h3>
                  <p className="text-gray-300 text-sm">
                    by {transaction.bookId?.author || 'Unknown Author'}
                  </p>
                </div>
              </div>
              <div className="bg-gray-800/50 p-2 rounded-lg mb-3">
                <div className="text-xs text-gray-300">
                  <span className="font-semibold text-gray-200">ISBN:</span> {transaction.bookId?.isbn || 'N/A'}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              {getStatusBadge(transaction.status)}
              {getDueDateInfo(transaction.dueDate, transaction.status)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-gray-300 mb-4">
            <div className="bg-gray-800/30 p-2 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3 text-green-400" />
                <span className="font-semibold text-gray-200 text-xs">Borrowed:</span>
              </div>
              <div className="text-white text-sm">{formatDate(transaction.borrowDate)}</div>
            </div>
            <div className="bg-gray-800/30 p-2 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3 text-yellow-400" />
                <span className="font-semibold text-gray-200 text-xs">Due:</span>
              </div>
              <div className="text-white text-sm">{formatDate(transaction.dueDate)}</div>
            </div>
            {transaction.returnDate && (
              <div className="bg-gray-800/30 p-2 rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="h-3 w-3 text-green-400" />
                  <span className="font-semibold text-gray-200 text-xs">Returned:</span>
                </div>
                <div className="text-white text-sm">{formatDate(transaction.returnDate)}</div>
              </div>
            )}
            <div className="bg-gray-800/30 p-2 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <RefreshCw className="h-3 w-3 text-blue-400" />
                <span className="font-semibold text-gray-200 text-xs">Renewals:</span>
              </div>
              <div className="text-white text-sm">{transaction.renewalCount}/2</div>
            </div>
          </div>

          {transaction.status === 'borrowed' && (
            <div className="flex flex-wrap gap-3">
              {canRenew && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRenewBook(transaction._id)}
                  disabled={actionLoading[transaction._id] === 'renewing'}
                  className="btn-secondary flex items-center"
                >
                  {actionLoading[transaction._id] === 'renewing' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Renew Book
                </Button>
              )}
              
              {fine > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePayFine(transaction._id, fine)}
                  disabled={actionLoading[transaction._id] === 'paying'}
                  className="flex items-center text-red-400 border-red-400/50 hover:bg-red-900/20"
                >
                  {actionLoading[transaction._id] === 'paying' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Pay Fine (${fine})
                </Button>
              )}
              
              <Link to={`/transactions/${transaction._id}`}>
                <Button size="sm" variant="outline" className="btn-secondary flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  Details
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </motion.div>
    )
  }

  const BookCard = ({ book }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated border-gray-700/30 group hover:scale-[1.02] transition-all duration-300"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-500/20 rounded-lg">
                <BookOpen className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-green-400 transition-colors">
                  {book.title}
                </h3>
                <p className="text-gray-300 text-sm">by {book.author}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {book.genre}
              </Badge>
              <Badge variant="success" className="text-xs px-2 py-0.5">
                Available
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
          <Button
            size="sm"
            onClick={() => handleBorrowBook(book._id)}
            disabled={actionLoading[book._id] === 'borrowing'}
            className="btn-primary flex items-center text-xs px-3 py-1"
          >
            {actionLoading[book._id] === 'borrowing' ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            Borrow Book
          </Button>
        </div>
      </CardContent>
    </motion.div>
  )

  return (
    <div className="max-w-7xl mx-auto pt-4 space-y-4 min-w-[900px]">
      {/* Professional Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white">My Transactions</h1>
          <p className="text-lg text-gray-300">Manage your borrowed books and library transactions</p>
        </div>
        <Button 
          onClick={() => {
            if (viewMode === 'my-transactions') {
              loadActiveTransactions()
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
            onClick={() => setViewMode('my-transactions')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              viewMode === 'my-transactions' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Library className="h-4 w-4" />
            My Books
          </button>
          <button
            onClick={() => setViewMode('borrow-books')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              viewMode === 'borrow-books' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Plus className="h-4 w-4" />
            Borrow Books
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

      {/* Enhanced Search for Borrow Books */}
      {viewMode === 'borrow-books' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search books by title, author, or genre..."
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
          {viewMode === 'my-transactions' && (
            <>
              {activeTransactions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="max-w-md mx-auto">
                    <BookOpen className="h-16 w-16 mx-auto text-gray-600 mb-6" />
                    <h3 className="text-2xl font-semibold text-gray-300 mb-4">No Active Transactions</h3>
                    <p className="text-gray-400 mb-6">You haven't borrowed any books yet.</p>
                    <Button 
                      className="btn-primary" 
                      onClick={() => setViewMode('borrow-books')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Browse Available Books
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {activeTransactions.map((transaction, index) => (
                    <motion.div
                      key={transaction._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <TransactionCard transaction={transaction} />
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {viewMode === 'borrow-books' && (
            <>
              {availableBooks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="max-w-md mx-auto">
                    <BookOpen className="h-16 w-16 mx-auto text-gray-600 mb-6" />
                    <h3 className="text-2xl font-semibold text-gray-300 mb-4">No Books Available</h3>
                    <p className="text-gray-400 mb-6">
                      {searchQuery ? 'Try adjusting your search terms.' : 'All books are currently borrowed.'}
                    </p>
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