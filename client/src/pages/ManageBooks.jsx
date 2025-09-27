import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../lib/api'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { useAuth } from '../hooks/useAuth'

export default function ManageBooks(){
  const { user } = useAuth()
  const [books, setBooks] = useState([])
  const [categories, setCategories] = useState([])
  const [authors, setAuthors] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title:'', authors:'', genre:'', isbn:'', copies:1, description:'', publisher:'', publicationYear:'' })
  const [editing, setEditing] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  async function load(){ 
    setLoading(true)
    try{ 
      const [booksRes, categoriesRes, authorsRes] = await Promise.all([
        request('/books'),
        request('/categories'),
        request('/authors/with-counts') // Use the working authors endpoint
      ])
      setBooks(booksRes.data?.books||[])
      setCategories(categoriesRes.data?.categories||[])
      setAuthors(authorsRes.data?.authors||[])
      setError('')
    }catch(e){ 
      setError(e.message) 
    }
    finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const response = await request('/books/stats')
      setStats(response.data?.stats || null)
    } catch (e) {
      console.error('Stats load error:', e)
    }
  }
  useEffect(()=>{ 
    load()
    loadStats()
  },[])

  function onChange(k, v){ setForm(prev=>({ ...prev, [k]: v })) }

  async function save(){
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    if (!form.genre) {
      setError('Please select a genre/category')
      return
    }
    if (!form.authors.trim()) {
      setError('Please enter an author name')
      return
    }
    
    try {
      // First, try to find or create the author
      const authorName = form.authors.trim()
      let authorId = null
      
      // Check if author already exists by searching through the authors we fetched
      const existingAuthor = authors.find(a => 
        a.name.toLowerCase() === authorName.toLowerCase()
      )
      
      if (existingAuthor) {
        authorId = existingAuthor._id
      } else {
        // Create new author
        const newAuthorRes = await request('/authors', {
          method: 'POST',
          body: JSON.stringify({
            name: authorName,
            biography: `Author of ${form.title}`,
            nationality: 'Unknown'
          })
        })
        authorId = newAuthorRes.data?.author?._id
      }
      
      if (!authorId) {
        setError('Failed to create or find author')
        return
      }
      
      const payload = { 
        ...form, 
        copies: Number(form.copies), 
        authors: [authorId] // Use the author ID
      }
      
      if (editing) await request(`/books/${editing}`, { method:'PUT', body: JSON.stringify(payload) })
      else await request('/books', { method:'POST', body: JSON.stringify(payload) })
      
      setForm({ title:'', authors:'', genre:'', isbn:'', copies:1, description:'', publisher:'', publicationYear:'' }); 
      setEditing(null); 
      setError('') // Clear errors on success
      setSuccess(editing ? 'Book updated successfully!' : 'Book created successfully!')
      await load() // Reload to get updated data including new authors
      await loadStats()
    }catch(e){ 
      setError(e.message) 
    }
  }

  async function remove(id){ 
    try{ 
      await request(`/books/${id}`, { method:'DELETE' })
      setDeleteConfirm(null)
      setSuccess('Book deleted successfully!')
      await load()
      await loadStats()
    }catch(e){ 
      setError(e.message) 
    } 
  }

  async function updateAvailability(bookId, availableCopies) {
    try {
      await request(`/books/${bookId}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ availableCopies })
      })
      setSuccess('Availability updated successfully!')
      await load()
    } catch (e) {
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Manage Books</h1>
        <Button onClick={load} disabled={loading}>
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
              <Label className="text-gray-200">ISBN</Label>
              <Input placeholder="ISBN Number" value={form.isbn} onChange={e=>onChange('isbn', e.target.value)} />
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
          <Button onClick={save} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? (editing ? 'Updating...' : 'Creating...') : (editing ? 'Update Book' : 'Create Book')}
          </Button>
          {editing && (
            <Button 
              variant="secondary" 
              onClick={()=>{ 
                setEditing(null); 
                setForm({ title:'', authors:'', genre:'', isbn:'', copies:1, description:'', publisher:'', publicationYear:'' }) 
              }}
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
                {book.authors?.map(author => author.name || author).join(', ') || 'Unknown Author'}
              </p>
            </div>
            
            <div className="space-y-1 text-sm text-gray-400">
              <div><strong>ISBN:</strong> {book.isbn || 'N/A'}</div>
              <div><strong>Publisher:</strong> {book.publisher || 'Unknown'}</div>
              <div><strong>Category:</strong> {book.genre?.name || 'Uncategorized'}</div>
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
                className="bg-blue-600 hover:bg-blue-700"
              >
                Edit
              </Button>
              {user?.role === 'admin' && (
                <Button 
                  onClick={() => setDeleteConfirm(book._id)} 
                  size="sm" 
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              )}
              <Button 
                onClick={() => {
                  const newAvailable = prompt(`Current: ${book.availableCopies}. Enter new available copies:`)
                  if (newAvailable !== null && !isNaN(newAvailable)) {
                    updateAvailability(book._id, parseInt(newAvailable))
                  }
                }}
                size="sm" 
                variant="secondary"
              >
                Update Stock
              </Button>
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
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
              <Button 
                onClick={() => setDeleteConfirm(null)} 
                variant="secondary"
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
