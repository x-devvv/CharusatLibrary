import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../hooks/useAuth'

export default function ManageTransactions(){
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [overdueTransactions, setOverdueTransactions] = useState([])
  const [stats, setStats] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('all') // all, overdue, stats
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { 
    loadTransactions()
    loadStats()
    if (viewMode === 'overdue') {
      loadOverdueTransactions()
    }
  }, [viewMode])

  async function loadTransactions() { 
    setLoading(true)
    try { 
      const response = await request('/transactions')
      let allTransactions = response.data?.transactions || []
      
      // Filter by search query if provided
      if (searchQuery) {
        allTransactions = allTransactions.filter(t => 
          t.bookId?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.userId?.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      
      setTransactions(allTransactions)
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
      const response = await request('/transactions/overdue')
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

  async function loadStats() {
    try {
      const response = await request('/transactions/stats')
      setStats(response.data?.stats || null)
    } catch (e) {
      console.error('Stats load error:', e)
    }
  }

  async function markReturn(transactionId) { 
    try { 
      await request(`/transactions/${transactionId}/return`, { 
        method: 'PUT', 
        body: JSON.stringify({ condition: 'good' }) 
      })
      setSuccess('Book returned successfully!')
      await loadTransactions()
      await loadOverdueTransactions()
      await loadStats()
    } catch (e) { 
      setError(e.message)
    } 
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
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

  const currentTransactions = viewMode === 'overdue' ? overdueTransactions : transactions

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Manage Transactions</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => setViewMode('all')} 
            variant={viewMode === 'all' ? 'default' : 'secondary'}
          >
            All Transactions
          </Button>
          <Button 
            onClick={() => setViewMode('overdue')} 
            variant={viewMode === 'overdue' ? 'default' : 'secondary'}
          >
            Overdue
          </Button>
          <Button 
            onClick={() => setViewMode('stats')} 
            variant={viewMode === 'stats' ? 'default' : 'secondary'}
          >
            Statistics
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-400 bg-red-900/30 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-md border border-green-400 bg-green-900/30 p-3 text-sm text-green-200">{success}</div>}

      {viewMode === 'stats' ? (
        // Statistics View
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Transaction Statistics</h2>
          
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
                <div className="text-2xl font-bold text-white">{stats.totalTransactions || 0}</div>
                <div className="text-gray-400 text-sm">Total Transactions</div>
              </div>
              <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
                <div className="text-2xl font-bold text-blue-400">{stats.activeTransactions || 0}</div>
                <div className="text-gray-400 text-sm">Active Loans</div>
              </div>
              <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
                <div className="text-2xl font-bold text-red-400">{stats.overdueTransactions || 0}</div>
                <div className="text-gray-400 text-sm">Overdue Books</div>
              </div>
              <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
                <div className="text-2xl font-bold text-green-400">{stats.returnedTransactions || 0}</div>
                <div className="text-gray-400 text-sm">Returned Books</div>
              </div>
              <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
                <div className="text-2xl font-bold text-yellow-400">${stats.totalFines || 0}</div>
                <div className="text-gray-400 text-sm">Total Fines</div>
              </div>
              <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
                <div className="text-2xl font-bold text-purple-400">${stats.paidFines || 0}</div>
                <div className="text-gray-400 text-sm">Paid Fines</div>
              </div>
              <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
                <div className="text-2xl font-bold text-orange-400">{stats.renewalCount || 0}</div>
                <div className="text-gray-400 text-sm">Total Renewals</div>
              </div>
              <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
                <div className="text-2xl font-bold text-cyan-400">{stats.averageLoanDays || 0}</div>
                <div className="text-gray-400 text-sm">Avg Loan Days</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Transactions List View
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label className="text-gray-200">Search Transactions</Label>
                <Input 
                  placeholder="Search by book title, user name, or email..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadTransactions()}
                />
              </div>
              <Button onClick={loadTransactions} disabled={loading}>
                Search
              </Button>
              <Button onClick={() => { setSearchQuery(''); loadTransactions(); }} variant="secondary">
                Clear
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">
              {viewMode === 'overdue' ? 'Overdue Transactions' : 'All Transactions'}
            </h2>
            <div className="text-gray-400 text-sm">
              {currentTransactions.length} transaction{currentTransactions.length !== 1 ? 's' : ''} found
            </div>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
              <div className="text-gray-400 mt-2">Loading transactions...</div>
            </div>
          )}

          <div className="space-y-3">
            {currentTransactions.map(transaction => {
              const overdue = isOverdue(transaction.dueDate) && transaction.status === 'borrowed'
              const daysOverdue = overdue ? getDaysOverdue(transaction.dueDate) : 0
              
              return (
                <div key={transaction._id} className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
                  <div className="grid gap-4 md:grid-cols-4 items-center">
                    {/* Book and User Info */}
                    <div className="md:col-span-2">
                      <Link to={`/books/${transaction.bookId?._id || transaction.bookId}`}>
                        <h3 className="font-medium text-white hover:text-blue-400 transition-colors">
                          {transaction.bookId?.title || 'Unknown Book'}
                        </h3>
                      </Link>
                      <p className="text-gray-300 text-sm">
                        by {transaction.bookId?.authors?.map(author => author.name || author).join(', ') || 'Unknown Author'}
                      </p>
                      <div className="mt-1">
                        <Link to={`/admin/users/${transaction.userId?._id || transaction.userId}`}>
                          <span className="text-blue-400 hover:text-blue-300 text-sm">
                            {transaction.userId?.name || 'Unknown User'}
                          </span>
                        </Link>
                        <span className="text-gray-400 text-sm ml-2">
                          ({transaction.userId?.email || 'No email'})
                        </span>
                      </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Borrowed:</span>
                        <span className="text-white">{formatDate(transaction.borrowDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Due:</span>
                        <span className={overdue ? 'text-red-400 font-medium' : 'text-white'}>
                          {formatDate(transaction.dueDate)}
                        </span>
                      </div>
                      {transaction.returnDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Returned:</span>
                          <span className="text-green-400">{formatDate(transaction.returnDate)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status, transaction.dueDate)}`}>
                          {overdue ? 'OVERDUE' : transaction.status?.toUpperCase()}
                        </span>
                      </div>
                      {overdue && (
                        <div className="text-red-400 text-xs font-medium">
                          {daysOverdue} days overdue
                        </div>
                      )}
                      {transaction.renewalCount > 0 && (
                        <div className="text-blue-400 text-xs">
                          Renewed {transaction.renewalCount} time{transaction.renewalCount !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {transaction.status === 'borrowed' && (
                        <Button 
                          onClick={() => markReturn(transaction._id)} 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Mark as Returned
                        </Button>
                      )}
                      <Link to={`/transactions/${transaction._id}`}>
                        <Button size="sm" variant="secondary" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      
                      {/* Fine Information */}
                      {transaction.fineAmount > 0 && (
                        <div className="bg-red-900/20 border border-red-800 rounded p-2 mt-2">
                          <div className="text-red-400 text-xs font-medium">
                            Fine: ${transaction.fineAmount}
                            {transaction.finePaid ? ' (Paid)' : ' (Unpaid)'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {!loading && currentTransactions.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-lg mb-2">
                {viewMode === 'overdue' ? 'No overdue transactions' : 'No transactions found'}
              </div>
              <div className="text-sm">
                {searchQuery ? 'Try a different search term' : 
                 viewMode === 'overdue' ? 'All books are returned on time!' : 'No transactions have been made yet'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
