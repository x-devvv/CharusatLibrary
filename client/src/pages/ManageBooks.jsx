import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../lib/api'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { useAuth } from '../contexts/AuthContext'

export default function ManageBooks(){
  const { user } = useAuth()
  const [books, setBooks] = useState([])
  // Static list of book categories
  const categories = [
    { _id: 'fiction', name: 'Fiction' },
    { _id: 'non-fiction', name: 'Non-Fiction' },
    { _id: 'mystery', name: 'Mystery' },
    { _id: 'romance', name: 'Romance' },
    { _id: 'science-fiction', name: 'Science Fiction' },
    { _id: 'fantasy', name: 'Fantasy' },
    { _id: 'biography', name: 'Biography' },
    { _id: 'history', name: 'History' },
    { _id: 'science', name: 'Science' },
    { _id: 'technology', name: 'Technology' },
    { _id: 'business', name: 'Business' },
    { _id: 'self-help', name: 'Self Help' },
    { _id: 'health', name: 'Health & Fitness' },
    { _id: 'cooking', name: 'Cooking' },
    { _id: 'travel', name: 'Travel' },
    { _id: 'art', name: 'Art & Design' },
    { _id: 'music', name: 'Music' },
    { _id: 'sports', name: 'Sports' },
    { _id: 'education', name: 'Education' },
    { _id: 'children', name: 'Children\'s Books' },
    { _id: 'young-adult', name: 'Young Adult' },
    { _id: 'poetry', name: 'Poetry' },
    { _id: 'drama', name: 'Drama' },
    { _id: 'philosophy', name: 'Philosophy' },
    { _id: 'religion', name: 'Religion & Spirituality' }
  ]
  const [authors, setAuthors] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title:'', authors:'', genre:'', isbn:'', copies:1, description:'', publisher:'', publicationYear:'' })
  const [editing, setEditing] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  async function loadStats() {
    try {
      const statsRes = await request('/books/stats')
      setStats(statsRes.data?.stats||null)
    } catch (statsError) {
      console.log('Stats not available:', statsError.message)
      setStats(null)
    }
  }

  async function load(){ 
    setLoading(true)
    try{ 
      const [booksRes, authorsRes] = await Promise.all([
        request('/books'),
        request('/authors') // Use basic authors endpoint
      ])
      setBooks(booksRes.data?.books||[])
      setAuthors(authorsRes.data?.authors||[])
      
      // Load stats separately
      await loadStats()
      
      setError('')
    } catch(e){ 
      setError(e.message) 
    } finally{ 
      setLoading(false) 
    }
  }

  useEffect(()=>{ 
    load()
    
    // Set up interval to refresh stats every 30 seconds
    const statsInterval = setInterval(() => {
      loadStats()
    }, 30000)
    
    // Refresh stats when window gains focus (user switches back to tab)
    const handleFocus = () => {
      loadStats()
    }
    window.addEventListener('focus', handleFocus)
    
    // Listen for transaction updates from other pages
    const handleTransactionUpdate = (event) => {
      console.log('Transaction update received:', event.detail)
      loadStats() // Refresh stats when transactions change
    }
    window.addEventListener('transactionUpdate', handleTransactionUpdate)
    
    return () => {
      clearInterval(statsInterval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('transactionUpdate', handleTransactionUpdate)
    }
  }, [])

  function onChange(k, v){ 
    setForm(prev => ({ ...prev, [k]: v.trim() })) 
  }

  async function save(){
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    if (!form.genre) {
      setError('Please select a genre/category')
      return
    }
    
    // Validate that the selected genre exists in our categories list
    const validGenre = categories.find(cat => cat._id === form.genre)
    if (!validGenre) {
      setError('Please select a valid category from the dropdown')
      return
    }
    if (!form.authors.trim()) {
      setError('Please enter an author name')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess('')
    
    // Generate a valid ISBN if not provided
    let isbn = form.isbn.trim()
    if (!isbn) {
      // Generate a proper ISBN-13 format (978 prefix + 10 digits)
      const timestamp = Date.now().toString().slice(-6) // Last 6 digits of timestamp
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      isbn = `978${timestamp}${random}`
    }
    
    // Clean and validate ISBN format
    isbn = isbn.replace(/[-\s]/g, '') // Remove dashes and spaces
    if (isbn.length < 13) {
      isbn = isbn.padEnd(13, '0') // Pad with zeros if too short
    } else if (isbn.length > 13) {
      isbn = isbn.substring(0, 13) // Truncate if too long
    }
    
    console.log('Generated/cleaned ISBN:', isbn)
    
    try {
      console.log('Starting book creation process...')
      console.log('Form data:', form)
      
      // Prepare author data - let backend handle author creation
      const authorName = form.authors.trim()
      
      // Check if author already exists
      const existingAuthor = authors.find(a => 
        a.name.toLowerCase() === authorName.toLowerCase()
      )
      
      console.log('Author handling:', existingAuthor ? 'Found existing' : 'Will create new', authorName)
      
      // Create payload with form data - backend now handles author/genre creation
      const payload = { 
        title: form.title.trim(),
        isbn: isbn,
        genre: form.genre, // Send genre ID from dropdown
        authors: authorName, // Send author name - backend will create if needed
        copies: Number(form.copies) || 1,
        description: form.description || '',
        publisher: form.publisher || '',
        publicationYear: form.publicationYear || ''
      }
      
      console.log('Sending payload with backend auto-creation support')
      
      console.log('Sending payload:', payload)
      console.log('Payload validation:')
      console.log('- Title:', payload.title, payload.title ? '✓' : '✗')
      console.log('- ISBN:', payload.isbn, payload.isbn ? '✓' : '✗')
      console.log('- Genre:', payload.genre, payload.genre ? '✓' : '✗')
      console.log('- Authors:', payload.authors, payload.authors ? '✓' : '✗')
      console.log('- Copies:', payload.copies, payload.copies > 0 ? '✓' : '✗')
      
      let response
      if (editing) {
        response = await request(`/books/${editing}`, { 
          method: 'PUT', 
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } else {
        response = await request('/books', { 
          method: 'POST', 
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
      
      console.log('API Response:', response)
      
      // Clear form and show success
      setForm({ title:'', authors:'', genre:'', isbn:'', copies:1, description:'', publisher:'', publicationYear:'' }); 
      setEditing(null); 
      setError('') // Clear errors on success
      setSuccess(editing ? 'Book updated successfully!' : 'Book created successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
      
      console.log('Reloading books list...')
      await load() // Reload to get updated data
      
    }catch(e){ 
      console.error('Error creating book:', e)
      console.error('Error details:', e.response || e)
      
      // Try to extract more specific error message
      let errorMessage = 'Failed to create book. Please try again.'
      if (e.response?.data?.message) {
        errorMessage = e.response.data.message
      } else if (e.message) {
        errorMessage = e.message
      }
      
      setError(errorMessage)
      setSuccess('') // Clear success message on error
    } finally {
      setLoading(false)
    }
  }

  async function remove(id){ 
    try{ 
      await request(`/books/${id}`, { method:'DELETE' })
      setDeleteConfirm(null)
      setSuccess('Book deleted successfully!')
      await load()
      await loadStats() // Refresh stats immediately
    }catch(e){ 
      setError(e.message) 
    } 
  }


  function startEdit(b){ 
    setEditing(b._id); 
    setForm({ 
      title: b.title||'', 
      authors: (b.authors && b.authors[0]) ? (b.authors[0].name || b.authors[0]) : '', // Use author name for editing
      genre: (b.genre?._id || b.genre || ''), 
      isbn: b.isbn||'', 
      copies: b.copies||1, 
      description: b.description||'',
      publisher: b.publisher||'',
      publicationYear: b.publicationYear||'' 
    }) 
  }

  const getAvailabilityColor = (available, total) => {
    const ratio = available / total
    if (ratio === 0) return 'text-red-400 bg-red-900/30'
    if (ratio < 0.3) return 'text-yellow-400 bg-yellow-900/30'
    return 'text-green-400 bg-green-900/30'
  }

  return (
    <div className="max-w-7xl mx-auto pt-6 space-y-6 min-w-[1000px]">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Manage Books</h1>
        <Button onClick={load} disabled={loading} className="btn-secondary text-sm px-4 py-2 font-medium">
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && <div className="rounded-md border border-red-400 bg-red-900/30 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-md border border-green-400 bg-green-900/30 p-3 text-sm text-green-200">{success}</div>}
      
      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
            <div className="text-2xl font-bold text-white">{stats.totalBooks || 0}</div>
            <div className="text-gray-400 text-sm">Total Books</div>
          </div>
          <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
            <div className="text-2xl font-bold text-green-400">{stats.availableBooks || 0}</div>
            <div className="text-gray-400 text-sm">Available</div>
          </div>
          <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
            <div className="text-2xl font-bold text-yellow-400">{stats.borrowedBooks || 0}</div>
            <div className="text-gray-400 text-sm">Borrowed</div>
          </div>
          <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.totalCopies || 0}</div>
            <div className="text-gray-400 text-sm">Total Copies</div>
          </div>
        </div>
      )}

      {/* Add/Edit Book Form */}
      <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">{editing? 'Edit Book' : 'Add New Book'}</h2>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-gray-200">Title *</Label>
              <Input placeholder="Book Title" value={form.title} onChange={e=>onChange('title', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">ISBN (Optional)</Label>
              <Input placeholder="ISBN Number (auto-generated if empty)" value={form.isbn} onChange={e=>onChange('isbn', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">Publisher</Label>
              <Input placeholder="Publisher Name" value={form.publisher} onChange={e=>onChange('publisher', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">Publication Year</Label>
              <Input placeholder="YYYY" type="number" value={form.publicationYear} onChange={e=>onChange('publicationYear', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">Category *</Label>
              <select 
                className="h-10 px-3 rounded-md border border-gray-700 bg-[#020617]/50 text-gray-200 text-sm w-full"
                value={form.genre} 
                onChange={e=>onChange('genre', e.target.value)}
              >
                <option value="">Select a category...</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-200">Copies</Label>
              <Input placeholder="Number of copies" type="number" min={1} value={form.copies} onChange={e=>onChange('copies', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-200">Author Name *</Label>
            <Input 
              placeholder="Enter author name (e.g., J.K. Rowling)" 
              value={form.authors} 
              onChange={e=>onChange('authors', e.target.value)} 
            />
            <div className="text-xs text-gray-400">
              Enter the full name of the author. Existing authors: {authors.map(a => a.name).join(', ')}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-200">Description</Label>
            <textarea 
              className="min-h-20 px-3 py-2 rounded-md border border-gray-700 bg-[#020617]/50 text-gray-200 text-sm w-full"
              placeholder="Book description..."
              value={form.description} 
              onChange={e=>onChange('description', e.target.value)}
              rows={3}
            />
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button onClick={save} disabled={loading} className="btn-primary text-sm px-4 py-2 font-medium">
            {loading ? (editing ? 'Updating...' : 'Creating...') : (editing ? 'Update Book' : 'Create Book')}
          </Button>
          {editing && (
            <Button 
              variant="secondary" 
              onClick={()=>{ 
                setEditing(null); 
                setForm({ title:'', authors:'', genre:'', isbn:'', copies:1, description:'', publisher:'', publicationYear:'' }) 
              }}
              className="btn-secondary text-sm px-4 py-2 font-medium"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
      
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <div className="text-gray-400 mt-2">Loading books...</div>
        </div>
      )}

      {/* Books List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {books.map(book => (
          <div key={book._id} className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4 space-y-3">
            <div>
              <Link to={`/books/${book._id}`}>
                <h3 className="font-medium text-lg text-white hover:text-blue-400 transition-colors">
                  {book.title || 'Untitled'}
                </h3>
              </Link>
              <p className="text-gray-300 text-sm">
                {book.authors || 'Unknown Author'}
              </p>
            </div>
            
            <div className="space-y-1 text-sm text-gray-400">
              <div><strong>ISBN:</strong> {book.isbn || 'N/A'}</div>
              <div><strong>Category:</strong> {book.genre || 'Uncategorized'}</div>
            </div>

            <div className="flex justify-between items-center">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(book.availableCopies, book.copies)}`}>
                {book.availableCopies || 0} / {book.copies || 0} Available
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => startEdit(book)} 
                size="sm" 
                className="btn-primary text-xs px-3 py-1.5 font-medium"
              >
                Edit
              </Button>
              {user?.role === 'admin' && (
                <Button 
                  onClick={() => setDeleteConfirm(book._id)} 
                  size="sm" 
                  className="btn-destructive text-xs px-3 py-1.5 font-medium"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {!loading && books.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-lg mb-2">No books found</div>
          <div className="text-sm">Add your first book to get started.</div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#020617]/95 backdrop-blur-md border border-gray-700 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Delete</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this book? This action cannot be undone and will affect all related transactions.
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={() => remove(deleteConfirm)} 
                className="btn-destructive text-sm px-4 py-2 font-medium"
              >
                Delete
              </Button>
              <Button 
                onClick={() => setDeleteConfirm(null)} 
                variant="secondary"
                className="btn-secondary text-sm px-4 py-2 font-medium"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
