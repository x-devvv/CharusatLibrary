import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { request } from '../lib/api'
import { Button } from '../components/ui/button'
import { useAuth } from '../hooks/useAuth'

export default function TransactionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [transaction, setTransaction] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (id) {
      loadTransaction()
    }
  }, [id])

  async function loadTransaction() {
    setLoading(true)
    try {
      const response = await request(`/transactions/${id}`)
      setTransaction(response.data?.transaction)
      setError('')
    } catch (e) {
      setError(e.message)
    }
    finally {
      setLoading(false)
    }
  }

  async function returnBook() {
    try {
      await request(`/transactions/${id}/return`, { 
        method: 'PUT',
        body: JSON.stringify({ condition: 'good' })
      })
      setSuccess('Book returned successfully!')
      await loadTransaction()
    } catch (e) {
      setError(e.message)
    }
  }

  async function renewBook() {
    try {
      await request(`/transactions/${id}/renew`, { method: 'PUT' })
      setSuccess('Book renewed successfully!')
      await loadTransaction()
    } catch (e) {
      setError(e.message)
    }
  }

  async function payFine() {
    try {
      await request(`/transactions/${id}/pay-fine`, { method: 'PUT' })
      setSuccess('Fine paid successfully!')
      await loadTransaction()
    } catch (e) {
      setError(e.message)
    }
  }

  const getStatusColor = (status, dueDate) => {
    if (status === 'returned') return 'text-green-400 bg-green-900/30'
    if (status === 'borrowed' && new Date(dueDate) < new Date()) return 'text-red-400 bg-red-900/30'
    if (status === 'borrowed') return 'text-blue-400 bg-blue-900/30'
    return 'text-gray-400 bg-gray-900/30'
  }

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date()
  }

  const getDaysOverdue = (dueDate) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = now - due
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDaysUntilDue = (dueDate) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = due - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <div className="text-gray-400 mt-2">Loading transaction details...</div>
        </div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center text-gray-400">
          <div className="text-lg mb-2">Transaction not found</div>
          <div className="text-sm mb-4">{error}</div>
          <Link to="/transactions">
            <Button variant="secondary">← Back to Transactions</Button>
          </Link>
        </div>
      </div>
    )
  }

  const overdue = isOverdue(transaction.dueDate) && transaction.status === 'borrowed'
  const daysOverdue = overdue ? getDaysOverdue(transaction.dueDate) : 0
  const daysUntilDue = !overdue && transaction.status === 'borrowed' ? getDaysUntilDue(transaction.dueDate) : 0
  const canRenew = transaction.status === 'borrowed' && !overdue && transaction.renewalCount < 2
  const isOwnTransaction = user._id === transaction.userId?._id || user._id === transaction.userId
  const canManage = user.role === 'admin' || user.role === 'librarian'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to={canManage ? "/admin/manage-transactions" : "/transactions"}>
          <Button variant="secondary">← Back to Transactions</Button>
        </Link>
        <h1 className="text-3xl font-bold text-white">Transaction Details</h1>
      </div>

      {error && <div className="rounded-md border border-red-400 bg-red-900/30 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-md border border-green-400 bg-green-900/30 p-3 text-sm text-green-200">{success}</div>}

      {/* Transaction Information */}
      <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Transaction Information</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(transaction.status, transaction.dueDate)}`}>
            {overdue ? 'OVERDUE' : transaction.status?.toUpperCase()}
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Book Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Book Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-300">Title</label>
                <Link to={`/books/${transaction.bookId?._id || transaction.bookId}`}>
                  <div className="text-white hover:text-blue-400 transition-colors">
                    {transaction.bookId?.title || 'Unknown Book'}
                  </div>
                </Link>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Author(s)</label>
                <div className="text-white">
                  {transaction.bookId?.authors?.map(author => author.name || author).join(', ') || 'Unknown Author'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">ISBN</label>
                <div className="text-white">{transaction.bookId?.isbn || 'N/A'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Category</label>
                <div className="text-white">
                  {transaction.bookId?.category?.name || transaction.bookId?.genre || 'Uncategorized'}
                </div>
              </div>
            </div>
          </div>

          {/* User Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Borrower Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-300">Name</label>
                {canManage ? (
                  <Link to={`/admin/users/${transaction.userId?._id || transaction.userId}`}>
                    <div className="text-blue-400 hover:text-blue-300 transition-colors">
                      {transaction.userId?.name || 'Unknown User'}
                    </div>
                  </Link>
                ) : (
                  <div className="text-white">{transaction.userId?.name || 'Unknown User'}</div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Email</label>
                <div className="text-white">{transaction.userId?.email || 'No email'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Phone</label>
                <div className="text-white">{transaction.userId?.phone || 'No phone'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Role</label>
                <div className="text-white capitalize">{transaction.userId?.role || 'Unknown'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Timeline */}
      <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Transaction Timeline</h2>
        
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-300">Borrowed Date</label>
              <div className="text-white">{new Date(transaction.borrowDate).toLocaleDateString()}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300">Due Date</label>
              <div className={overdue ? 'text-red-400 font-medium' : 'text-white'}>
                {new Date(transaction.dueDate).toLocaleDateString()}
              </div>
            </div>
            {transaction.returnDate && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-300">Returned Date</label>
                  <div className="text-green-400">{new Date(transaction.returnDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Return Condition</label>
                  <div className="text-white capitalize">{transaction.returnCondition || 'Good'}</div>
                </div>
              </>
            )}
          </div>

          {/* Status Information */}
          <div className="border-t border-gray-700 pt-4">
            {overdue && (
              <div className="bg-red-900/20 border border-red-800 rounded p-3 mb-3">
                <div className="text-red-400 font-medium">
                  ⚠️ This book is {daysOverdue} days overdue
                </div>
              </div>
            )}
            
            {!overdue && transaction.status === 'borrowed' && (
              <div className="bg-blue-900/20 border border-blue-800 rounded p-3 mb-3">
                <div className="text-blue-400">
                  📅 {daysUntilDue} days remaining until due date
                </div>
              </div>
            )}

            {transaction.renewalCount > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-800 rounded p-3 mb-3">
                <div className="text-yellow-400">
                  🔄 This book has been renewed {transaction.renewalCount} time{transaction.renewalCount !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fine Information */}
      {transaction.fineAmount > 0 && (
        <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Fine Information</h2>
          
          <div className="bg-red-900/20 border border-red-800 rounded p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-red-400 font-medium text-lg">
                  Fine Amount: ${transaction.fineAmount}
                </div>
                <div className="text-gray-400 text-sm">
                  Status: {transaction.finePaid ? 'Paid' : 'Unpaid'}
                </div>
                {transaction.finePaidDate && (
                  <div className="text-gray-400 text-sm">
                    Paid on: {new Date(transaction.finePaidDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              {!transaction.finePaid && (isOwnTransaction || canManage) && (
                <Button 
                  onClick={payFine} 
                  className="bg-red-600 hover:bg-red-700"
                >
                  Pay Fine
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Actions</h2>
        
        <div className="flex gap-3 flex-wrap">
          {transaction.status === 'borrowed' && canManage && (
            <Button 
              onClick={returnBook} 
              className="bg-green-600 hover:bg-green-700"
            >
              Mark as Returned
            </Button>
          )}
          
          {canRenew && (isOwnTransaction || canManage) && (
            <Button 
              onClick={renewBook} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              Renew Book ({2 - transaction.renewalCount} renewals left)
            </Button>
          )}

          {canManage && (
            <Link to={`/admin/users/${transaction.userId?._id || transaction.userId}`}>
              <Button variant="secondary">
                View User Profile
              </Button>
            </Link>
          )}

          <Link to={`/books/${transaction.bookId?._id || transaction.bookId}`}>
            <Button variant="secondary">
              View Book Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
