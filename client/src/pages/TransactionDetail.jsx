import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { request } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../hooks/useAuth'
import transactionService from '../services/transactionService'
import { 
  Calendar, Clock, DollarSign, AlertTriangle, CheckCircle, XCircle, 
  RefreshCw, ArrowLeft, User, BookOpen, CreditCard, History, 
  MapPin, Phone, Mail, Hash, Shield, Award, TrendingUp, Star
} from 'lucide-react'

export default function TransactionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [transaction, setTransaction] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  const isAdminOrLibrarian = user?.role === 'admin' || user?.role === 'librarian'
  const isOwner = transaction?.userId?._id === user?._id

  useEffect(() => {
    if (id) {
      loadTransaction()
    }
  }, [id])

  async function loadTransaction() {
    setLoading(true)
    try {
      const response = await transactionService.getTransaction(id)
      setTransaction(response.data?.transaction)
      setError('')
    } catch (e) {
      setError(e.message)
    }
    finally {
      setLoading(false)
    }
  }

  async function handleReturnBook() {
    setActionLoading(prev => ({ ...prev, return: true }))
    try {
      await transactionService.returnBook(id)
      setSuccess('Book returned successfully')
      loadTransaction()
    } catch (e) {
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, return: false }))
    }
  }

  async function handleRenewBook() {
    setActionLoading(prev => ({ ...prev, renew: true }))
    try {
      await transactionService.renewBook(id)
      setSuccess('Book renewed successfully')
      loadTransaction()
    } catch (e) {
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, renew: false }))
    }
  }

  async function handlePayFine() {
    const fine = transactionService.calculateFine(transaction.dueDate)
    setActionLoading(prev => ({ ...prev, pay: true }))
    try {
      await transactionService.payFine(id, { amount: fine })
      setSuccess('Fine paid successfully')
      loadTransaction()
    } catch (e) {
      setError(e.message)
    }
    finally {
      setActionLoading(prev => ({ ...prev, pay: false }))
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
    const statusInfo = transactionService.formatTransactionStatus(status)
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <div className="text-gray-400 mt-4 text-lg">Loading transaction details...</div>
        </motion.div>
      </div>
    )
  }

  if (error && !transaction) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-gray-400"
        >
          <XCircle className="h-16 w-16 mx-auto text-red-400 mb-6" />
          <h2 className="text-2xl font-semibold mb-4">Transaction Not Found</h2>
          <p className="text-lg mb-6">{error}</p>
          <Button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </motion.div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="text-center text-gray-400">
          <p className="text-lg">No transaction data available</p>
        </div>
      </div>
    )
  }

  const isOverdue = transactionService.isOverdue(transaction.dueDate) && transaction.status === 'borrowed'
  const fine = isOverdue ? transactionService.calculateFine(transaction.dueDate) : 0
  const daysUntilDue = transactionService.getDaysUntilDue(transaction.dueDate)
  const canRenew = transaction.renewalCount < 2 && transaction.status === 'borrowed' && !isOverdue

  return (
    <div className="max-w-7xl mx-auto pt-4 space-y-4 min-w-[1000px]">
      {/* Professional Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Transaction Details</h1>
            <p className="text-lg text-gray-300 mt-1">Transaction ID: {transaction._id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(transaction.status)}
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Actions and Book Info */}
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="card-elevated border-gray-700/30">
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <BookOpen className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white mb-3">
                      {transaction.bookId?.title || 'Unknown Book'}
                    </h2>
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-300 mb-4">
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <User className="h-3 w-3 text-blue-400" />
                          <span className="font-semibold text-gray-200 text-xs">Author:</span>
                        </div>
                        <div className="text-white text-sm">{transaction.bookId?.author || 'Unknown'}</div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <Award className="h-3 w-3 text-purple-400" />
                          <span className="font-semibold text-gray-200 text-xs">Genre:</span>
                        </div>
                        <div className="text-white text-sm">{transaction.bookId?.genre || 'Unknown'}</div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <Hash className="h-3 w-3 text-green-400" />
                          <span className="font-semibold text-gray-200 text-xs">ISBN:</span>
                        </div>
                        <div className="text-white font-mono text-xs">{transaction.bookId?.isbn || 'N/A'}</div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <Shield className="h-3 w-3 text-orange-400" />
                          <span className="font-semibold text-gray-200 text-xs">Publisher:</span>
                        </div>
                        <div className="text-white text-sm">{transaction.bookId?.publisher || 'Unknown'}</div>
                      </div>
                    </div>
                    {transaction.bookId?.description && (
                      <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-base font-semibold text-white mb-2">Description</h3>
                        <p className="text-gray-200 text-sm leading-relaxed">{transaction.bookId.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions Section */}
          {transaction && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="card-elevated border-gray-700/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white text-xl font-semibold">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    </div>
                    Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {isAdminOrLibrarian && (
                      <Button
                        onClick={handleReturnBook}
                        disabled={actionLoading.return}
                        className="w-full btn-primary flex items-center justify-center"
                      >
                        {actionLoading.return ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Return Book
                      </Button>
                    )}
                    
                    {canRenew && (isOwner || isAdminOrLibrarian) && (
                      <Button
                        variant="outline"
                        onClick={handleRenewBook}
                        disabled={actionLoading.renew}
                        className="w-full btn-secondary flex items-center justify-center"
                      >
                        {actionLoading.renew ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Renew Book
                      </Button>
                    )}
                    
                    {fine > 0 && (isOwner || isAdminOrLibrarian) && (
                      <Button
                        variant="outline"
                        onClick={handlePayFine}
                        disabled={actionLoading.pay}
                        className="w-full flex items-center justify-center border-red-400/50 text-red-400 hover:bg-red-900/20"
                      >
                        {actionLoading.pay ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4 mr-2" />
                        )}
                        Pay Fine (${fine})
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Enhanced Transaction Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="card-elevated border-gray-700/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white text-xl font-semibold">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <History className="h-5 w-5 text-yellow-400" />
                  </div>
                  Transaction Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-blue-500/20 rounded-full">
                      <CheckCircle className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-white">Book Borrowed</p>
                      <p className="text-sm text-gray-400">{formatDate(transaction.borrowDate)}</p>
                    </div>
                  </div>
                  
                  {transaction.renewalHistory && transaction.renewalHistory.length > 0 && (
                    transaction.renewalHistory.map((renewal, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="p-2 bg-yellow-500/20 rounded-full">
                          <RefreshCw className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-base font-semibold text-white">Book Renewed</p>
                          <p className="text-sm text-gray-400">{formatDate(renewal.date)}</p>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {transaction.returnDate && (
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-green-500/20 rounded-full">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-white">Book Returned</p>
                        <p className="text-sm text-gray-400">{formatDate(transaction.returnDate)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Enhanced Sidebar */}
        <div className="space-y-4">
          {/* User Information */}
          {isAdminOrLibrarian && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="card-elevated border-gray-700/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white text-xl font-semibold">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <User className="h-5 w-5 text-purple-400" />
                    </div>
                    Borrower Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-blue-400" />
                        <span className="font-semibold text-gray-200">Name:</span>
                      </div>
                      <div className="text-white">{transaction.userId?.name || 'Unknown'}</div>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-green-400" />
                        <span className="font-semibold text-gray-200">Email:</span>
                      </div>
                      <div className="text-white">{transaction.userId?.email || 'Unknown'}</div>
                    </div>
                    {transaction.userId?.phone && (
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="h-4 w-4 text-yellow-400" />
                          <span className="font-semibold text-gray-200">Phone:</span>
                        </div>
                        <div className="text-white">{transaction.userId.phone}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Enhanced Transaction Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="card-elevated border-gray-700/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white text-xl font-semibold">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Hash className="h-5 w-5 text-blue-400" />
                  </div>
                  Transaction Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-green-400" />
                      <span className="font-semibold text-gray-200">Borrow Date:</span>
                    </div>
                    <div className="text-white">{formatDate(transaction.borrowDate)}</div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-yellow-400" />
                      <span className="font-semibold text-gray-200">Due Date:</span>
                    </div>
                    <div className={`${isOverdue ? 'text-red-400' : 'text-white'}`}>
                      {formatDate(transaction.dueDate)}
                    </div>
                  </div>
                  {transaction.returnDate && (
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="font-semibold text-gray-200">Return Date:</span>
                      </div>
                      <div className="text-white">{formatDate(transaction.returnDate)}</div>
                    </div>
                  )}
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="h-4 w-4 text-blue-400" />
                      <span className="font-semibold text-gray-200">Renewals:</span>
                    </div>
                    <div className="text-white">{transaction.renewalCount}/2</div>
                  </div>
                  {fine > 0 && (
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-red-400/30">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-red-400" />
                        <span className="font-semibold text-gray-200">Fine Amount:</span>
                      </div>
                      <div className="text-red-400 font-bold text-lg">${fine}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Enhanced Status Information */}
          {transaction.status === 'borrowed' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="card-elevated border-gray-700/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white text-xl font-semibold">
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-400" />
                    </div>
                    Status Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isOverdue ? (
                      <div className="flex items-center text-red-400 p-4 bg-red-900/20 rounded-lg border border-red-400/30">
                        <AlertTriangle className="h-6 w-6 mr-3" />
                        <div>
                          <p className="font-semibold text-lg">Overdue</p>
                          <p className="text-sm">{Math.abs(daysUntilDue)} days past due</p>
                        </div>
                      </div>
                    ) : daysUntilDue <= 3 ? (
                      <div className="flex items-center text-yellow-400 p-4 bg-yellow-900/20 rounded-lg border border-yellow-400/30">
                        <Clock className="h-6 w-6 mr-3" />
                        <div>
                          <p className="font-semibold text-lg">Due Soon</p>
                          <p className="text-sm">Due in {daysUntilDue} days</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center text-green-400 p-4 bg-green-900/20 rounded-lg border border-green-400/30">
                        <CheckCircle className="h-6 w-6 mr-3" />
                        <div>
                          <p className="font-semibold text-lg">On Time</p>
                          <p className="text-sm">Due in {daysUntilDue} days</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}


        </div>
      </div>
    </div>
  )
}