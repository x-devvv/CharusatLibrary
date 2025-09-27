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
  Calendar, Clock, CheckCircle, XCircle, RefreshCw, Eye, Search, Filter, Download,
  AlertTriangle, TrendingUp, Shield, Award, User, Hash, BookOpen, Library
} from 'lucide-react'

export default function ManageTransactions(){
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [overdueTransactions, setOverdueTransactions] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('all')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  const isAdminOrLibrarian = user?.role === 'admin' || user?.role === 'librarian'

  useEffect(() => { 
    loadData()
    
    const handleTransactionUpdate = (event) => {
      console.log('Transaction update received:', event.detail)
      loadData()
    }
    window.addEventListener('transactionUpdate', handleTransactionUpdate)
    
    return () => {
      window.removeEventListener('transactionUpdate', handleTransactionUpdate)
    }
  }, [viewMode, statusFilter])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (viewMode === 'all') loadTransactions()
    }, 300)
    return () => clearTimeout(delayedSearch)
  }, [searchQuery])

  async function loadData() {
    if (viewMode === 'all') await loadTransactions()
    if (viewMode === 'overdue') await loadOverdueTransactions()
  }

  async function loadTransactions() { 
    setLoading(true)
    try { 
      const params = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (searchQuery) params.search = searchQuery
      
      const response = await transactionService.getAllTransactions(params)
      setTransactions(response.data?.transactions || [])
      setError('')
    } catch (e) { 
      console.error('Transactions load error:', e)
      setError(e.message) 
    }
    finally {
      setLoading(false)
    }
  }

  async function loadOverdueTransactions() {
    setLoading(true)
    try {
      const response = await transactionService.getOverdueTransactions()
      setOverdueTransactions(response.data?.transactions || [])
      setError('')
    } catch (e) {
      console.error('Overdue transactions load error:', e)
      setError(e.message)
    }
    finally {
      setLoading(false)
    }
  }

  async function handleReturnBook(transactionId) {
    setActionLoading(prev => ({ ...prev, [transactionId]: 'returning' }))
    try {
      await transactionService.returnBook(transactionId)
      setSuccess('Book returned successfully')
      loadData()
      
      window.dispatchEvent(new CustomEvent('transactionUpdate', { detail: { type: 'return', transactionId } }))
    } catch (e) {
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, [transactionId]: null }))
    }
  }

  async function handleRenewBook(transactionId) {
    setActionLoading(prev => ({ ...prev, [transactionId]: 'renewing' }))
    try {
      await transactionService.renewBook(transactionId)
      setSuccess('Book renewed successfully')
      loadData()
      
      window.dispatchEvent(new CustomEvent('transactionUpdate', { detail: { type: 'renew', transactionId } }))
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

  const TransactionCard = ({ transaction }) => (
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
                <span className="font-semibold text-gray-200">Borrowed by:</span> {transaction.userId?.name || 'Unknown User'} ({transaction.userId?.email})
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
          {transaction.renewalCount > 0 && (
            <div className="bg-gray-800/30 p-2 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <RefreshCw className="h-3 w-3 text-blue-400" />
                <span className="font-semibold text-gray-200 text-xs">Renewals:</span>
              </div>
              <div className="text-white text-sm">{transaction.renewalCount}</div>
            </div>
          )}
        </div>

        {isAdminOrLibrarian && transaction.status === 'borrowed' && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReturnBook(transaction._id)}
              disabled={actionLoading[transaction._id] === 'returning'}
              className="btn-secondary flex items-center"
            >
              {actionLoading[transaction._id] === 'returning' ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Return Book
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRenewBook(transaction._id)}
              disabled={actionLoading[transaction._id] === 'renewing' || transaction.renewalCount >= 2}
              className="btn-secondary flex items-center"
            >
              {actionLoading[transaction._id] === 'renewing' ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Renew
            </Button>
            
            <Link to={`/transactions/${transaction._id}`}>
              <Button size="sm" variant="outline" className="btn-secondary flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                Details
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </motion.div>
  )

  return (
    <div className="max-w-7xl mx-auto pt-4 space-y-4 min-w-[1000px]">
      {/* Professional Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white">Transaction Management</h1>
          <p className="text-lg text-gray-300">Comprehensive oversight of library transactions, returns, and renewals</p>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-medium">System Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="font-medium">Real-time Updates</span>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="btn-secondary flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>Export Data</span>
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
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              viewMode === 'all' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Library className="h-4 w-4" />
            All Transactions
          </button>
          <button
            onClick={() => setViewMode('overdue')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              viewMode === 'overdue' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Overdue Items
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

      {/* Enhanced Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="card-elevated border-gray-700/30">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by book title, user name, or email address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 input-field"
                  />
                </div>
              </div>
              
              {viewMode === 'all' && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">Filter by:</span>
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-gray-900/50 border border-gray-600/50 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200 min-w-[140px]"
                  >
                    <option value="all">All Status</option>
                    <option value="borrowed">Borrowed</option>
                    <option value="returned">Returned</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Content */}
      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-gray-400 mt-4 text-lg">Loading transactions...</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {viewMode === 'all' && (
            <>
              {transactions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="max-w-md mx-auto">
                    <Search className="h-16 w-16 mx-auto text-gray-600 mb-6" />
                    <h3 className="text-2xl font-semibold text-gray-300 mb-4">No Transactions Found</h3>
                    <p className="text-gray-400 mb-6">Try adjusting your search criteria or filters</p>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction, index) => (
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

          {viewMode === 'overdue' && (
            <>
              {overdueTransactions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="max-w-md mx-auto">
                    <CheckCircle className="h-16 w-16 mx-auto text-green-400 mb-6" />
                    <h3 className="text-2xl font-semibold text-green-300 mb-4">Excellent! No Overdue Transactions</h3>
                    <p className="text-green-400 mb-6">All library items are returned on time</p>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {overdueTransactions.map((transaction, index) => (
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
        </motion.div>
      )}
    </div>
  )
}