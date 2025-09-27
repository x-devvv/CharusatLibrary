import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../hooks/useAuth'

export default function Transactions(){
  const { user } = useAuth()
  const [activeTransactions, setActiveTransactions] = useState([])
  const [availableBooks, setAvailableBooks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('my-transactions') // my-transactions, borrow-books

  useEffect(() => { 
    loadActiveTransactions()
    if (viewMode === 'borrow-books') {
      loadAvailableBooks()
    }
  }, [viewMode])

  async function loadActiveTransactions() {
    setLoading(true)
    try {
      const response = await request(`/transactions/user/${user._id}/active`)
      setActiveTransactions(response.data?.transactions || [])
      setError('')
    } catch (e) {
      console.error('Active transactions load error:', e)
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
      // Filter only available books
      const available = books.filter(book => 
        book.status === 'available' && 
        book.availableCopies > 0 &&
        (!searchQuery || 
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.authors?.some(author => 
            (author.name || author).toLowerCase().includes(searchQuery.toLowerCase())
          ) ||
          book.isbn?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
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

  async function borrowBook(bookId) {
    try {
      await request('/transactions/borrow', { 
        method: 'POST', 
        body: JSON.stringify({ bookId }) 
      })
      setSuccess('Book borrowed successfully!')
      await loadActiveTransactions()
      await loadAvailableBooks()
    } catch (e) {
      setError(e.message)
    }
  }

  async function renewBook(transactionId) {
    try {
      await request(`/transactions/${transactionId}/renew`, { 
        method: 'PUT' 
      })
      setSuccess('Book renewed successfully!')
      await loadActiveTransactions()
    } catch (e) {
      setError(e.message)
    }
  }

  async function payFine(transactionId) {
    try {
      await request(`/transactions/${transactionId}/pay-fine`, { 
        method: 'PUT' 
      })
      setSuccess('Fine paid successfully!')
      await loadActiveTransactions()
    } catch (e) {
      setError(e.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'borrowed': return 'text-blue-400 bg-blue-900/30'
      case 'overdue': return 'text-red-400 bg-red-900/30'
      case 'returned': return 'text-green-400 bg-green-900/30'
      default: return 'text-gray-400 bg-gray-900/30'
    }
  }

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date()
  }

  const getDaysUntilDue = (dueDate) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = due - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">My Transactions</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => setViewMode('my-transactions')} 
            variant={viewMode === 'my-transactions' ? 'default' : 'secondary'}
          >
            My Books
          </Button>
          <Button 
            onClick={() => setViewMode('borrow-books')} 
            variant={viewMode === 'borrow-books' ? 'default' : 'secondary'}
          >
            Borrow Books
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-400 bg-red-900/30 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-md border border-green-400 bg-green-900/30 p-3 text-sm text-green-200">{success}</div>}

      {viewMode === 'my-transactions' ? (
        // My Active Transactions
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Active Borrowed Books</h2>
            <Button onClick={loadActiveTransactions} disabled={loading} size="sm">
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
              <div className="text-gray-400 mt-2">Loading transactions...</div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeTransactions.map(transaction => {
              const daysUntilDue = getDaysUntilDue(transaction.dueDate)
              const overdue = isOverdue(transaction.dueDate)
              
              return (
                <div key={transaction._id} className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4 space-y-3">
                  <div>
                    <Link to={`/books/${transaction.book?._id || transaction.bookId}`}>
                      <h3 className="font-medium text-lg text-white hover:text-blue-400 transition-colors">
                        {transaction.book?.title || 'Unknown Book'}
                      </h3>
                    </Link>
                    <p className="text-gray-300 text-sm">
                      {transaction.book?.authors?.map(author => author.name || author).join(', ') || 'Unknown Author'}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Borrowed:</span>
                      <span className="text-white">{new Date(transaction.borrowDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Due:</span>
                      <span className={overdue ? 'text-red-400 font-medium' : 'text-white'}>
                        {new Date(transaction.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(overdue ? 'overdue' : transaction.status)}`}>
                        {overdue ? 'OVERDUE' : transaction.status?.toUpperCase()}
                      </span>
                    </div>
                    {overdue ? (
                      <div className="text-red-400 text-xs font-medium">
                        {Math.abs(daysUntilDue)} days overdue
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs">
                        {daysUntilDue} days remaining
                      </div>
                    )}
                  </div>

                  {transaction.fineAmount > 0 && (
                    <div className="bg-red-900/20 border border-red-800 rounded p-2">
                      <div className="text-red-400 text-sm font-medium">
                        Fine: ${transaction.fineAmount}
                      </div>
                      {!transaction.finePaid && (
                        <Button 
                          onClick={() => payFine(transaction._id)} 
                          size="sm" 
                          className="mt-2 bg-red-600 hover:bg-red-700 w-full"
                        >
                          Pay Fine
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {!overdue && transaction.renewalCount < 2 && (
                      <Button 
                        onClick={() => renewBook(transaction._id)} 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Renew ({2 - transaction.renewalCount} left)
                      </Button>
                    )}
                    <Link to={`/transactions/${transaction._id}`}>
                      <Button size="sm" variant="secondary">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {!loading && activeTransactions.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-lg mb-2">No active transactions</div>
              <div className="text-sm mb-4">You haven't borrowed any books yet.</div>
              <Button onClick={() => setViewMode('borrow-books')}>
                Browse Books to Borrow
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Borrow Books View
        <div className="space-y-4">
          <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label className="text-gray-200">Search Books</Label>
                <Input 
                  placeholder="Search by title, author, or ISBN..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadAvailableBooks()}
                />
              </div>
              <Button onClick={loadAvailableBooks} disabled={loading}>
                Search
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Available Books</h2>
            <div className="text-gray-400 text-sm">
              {availableBooks.length} book{availableBooks.length !== 1 ? 's' : ''} available
            </div>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
              <div className="text-gray-400 mt-2">Loading available books...</div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {availableBooks.map(book => (
              <div key={book._id} className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4 space-y-3">
                <div>
                  <Link to={`/books/${book._id}`}>
                    <h3 className="font-medium text-lg text-white hover:text-blue-400 transition-colors line-clamp-2">
                      {book.title}
                    </h3>
                  </Link>
                  <p className="text-gray-300 text-sm">
                    {book.authors?.map(author => author.name || author).join(', ') || 'Unknown Author'}
                  </p>
                </div>

                <div className="space-y-1 text-sm text-gray-400">
                  <div><strong>ISBN:</strong> {book.isbn || 'N/A'}</div>
                  <div><strong>Category:</strong> {book.category?.name || book.genre || 'Uncategorized'}</div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="px-2 py-1 rounded-full text-xs font-medium text-green-400 bg-green-900/30">
                    {book.availableCopies} Available
                  </span>
                </div>

                <Button 
                  onClick={() => borrowBook(book._id)} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={book.availableCopies === 0}
                >
                  Borrow Book
                </Button>
              </div>
            ))}
          </div>

          {!loading && availableBooks.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-lg mb-2">No books available</div>
              <div className="text-sm">
                {searchQuery ? 'Try a different search term' : 'All books are currently borrowed'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
