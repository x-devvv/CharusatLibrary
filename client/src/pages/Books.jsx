import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../lib/api'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'

export default function Books(){
  const [books, setBooks] = useState([])
  const [popularBooks, setPopularBooks] = useState([])
  const [categories, setCategories] = useState([])
  const [authors, setAuthors] = useState([])
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedAuthor, setSelectedAuthor] = useState('')
  const [viewMode, setViewMode] = useState('all') // all, popular, category, author
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { 
    loadBooks()
    loadPopularBooks()
    loadCategories()
    loadAuthors()
  }, [])

  async function loadBooks() {
    setLoading(true)
    try { 
      const response = await request('/books')
      setBooks(response.data?.books || [])
      setError('')
    } catch (e) { 
      console.error('Books fetch error:', e)
      setError(e.message) 
    }
    finally {
      setLoading(false)
    }
  }

  async function loadPopularBooks() {
    try {
      const response = await request('/books/popular')
      setPopularBooks(response.data?.books || [])
    } catch (e) {
      console.error('Popular books fetch error:', e)
    }
  }

  async function loadCategories() {
    try {
      const response = await request('/categories')
      setCategories(response.data?.categories || [])
    } catch (e) {
      console.error('Categories fetch error:', e)
    }
  }

  async function loadAuthors() {
    try {
      const response = await request('/authors')
      setAuthors(response.data?.authors || [])
    } catch (e) {
      console.error('Authors fetch error:', e)
    }
  }

  async function searchBooks() { 
    if (!query.trim()) {
      setError('Please enter a search query')
      return
    }
    if (query.trim().length > 100) {
      setError('Search query must be less than 100 characters')
      return
    }
    setLoading(true)
    try { 
      const response = await request(`/books/search?q=${encodeURIComponent(query.trim())}`)
      setBooks(response.data?.books || [])
      setViewMode('search')
      setError('')
    } catch (e) { 
      console.error('Books search error:', e)
      setError(e.message) 
    }
    finally {
      setLoading(false)
    }
  }

  async function loadBooksByCategory(categoryId) {
    if (!categoryId) return
    setLoading(true)
    try {
      const response = await request(`/books/category/${categoryId}`)
      setBooks(response.data?.books || [])
      setViewMode('category')
      setError('')
    } catch (e) {
      console.error('Books by category error:', e)
      setError(e.message)
    }
    finally {
      setLoading(false)
    }
  }

  async function loadBooksByAuthor(authorId) {
    if (!authorId) return
    setLoading(true)
    try {
      const response = await request(`/books/author/${authorId}`)
      setBooks(response.data?.books || [])
      setViewMode('author')
      setError('')
    } catch (e) {
      console.error('Books by author error:', e)
      setError(e.message)
    }
    finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId)
    if (categoryId) {
      loadBooksByCategory(categoryId)
    } else {
      loadBooks()
      setViewMode('all')
    }
  }

  const handleAuthorChange = (authorId) => {
    setSelectedAuthor(authorId)
    if (authorId) {
      loadBooksByAuthor(authorId)
    } else {
      loadBooks()
      setViewMode('all')
    }
  }

  const showPopular = () => {
    setBooks(popularBooks)
    setViewMode('popular')
    setSelectedCategory('')
    setSelectedAuthor('')
    setQuery('')
  }

  const showAll = () => {
    loadBooks()
    setViewMode('all')
    setSelectedCategory('')
    setSelectedAuthor('')
    setQuery('')
  }

  const getViewTitle = () => {
    switch (viewMode) {
      case 'popular': return 'Popular Books'
      case 'search': return `Search Results for "${query}"`
      case 'category': return `Books in ${categories.find(c => c._id === selectedCategory)?.name || 'Category'}`
      case 'author': return `Books by ${authors.find(a => a._id === selectedAuthor)?.name || 'Author'}`
      default: return 'All Books'
    }
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
        <h1 className="text-3xl font-bold text-white">Library Books</h1>
        <div className="flex gap-2">
          <Button onClick={showAll} variant={viewMode === 'all' ? 'default' : 'secondary'}>
            All Books
          </Button>
          <Button onClick={showPopular} variant={viewMode === 'popular' ? 'default' : 'secondary'}>
            Popular
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-400 bg-red-900/30 p-3 text-sm text-red-200">{error}</div>}
      
      {/* Search and Filters */}
      <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Search */}
          <div className="space-y-2">
            <Label className="text-gray-200">Search Books</Label>
            <div className="flex gap-2">
              <Input 
                placeholder="Search by title, author, ISBN..." 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && searchBooks()} 
                className="flex-1"
              />
              <Button onClick={searchBooks} disabled={loading}>
                Search
              </Button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <Label className="text-gray-200">Filter by Category</Label>
            <select 
              className="h-10 px-3 rounded-md border border-gray-700 bg-[#020617]/50 text-gray-200 text-sm w-full"
              value={selectedCategory} 
              onChange={e => handleCategoryChange(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Author Filter */}
          <div className="space-y-2">
            <Label className="text-gray-200">Filter by Author</Label>
            <select 
              className="h-10 px-3 rounded-md border border-gray-700 bg-[#020617]/50 text-gray-200 text-sm w-full"
              value={selectedAuthor} 
              onChange={e => handleAuthorChange(e.target.value)}
            >
              <option value="">All Authors</option>
              {authors.map(author => (
                <option key={author._id} value={author._id}>
                  {author.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">{getViewTitle()}</h2>
        <div className="text-gray-400 text-sm">
          {books.length} book{books.length !== 1 ? 's' : ''} found
        </div>
      </div>
      
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <div className="text-gray-400 mt-2">Loading books...</div>
        </div>
      )}
      
      {/* Books Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {books.map(book => (
          <Link key={book._id} to={`/books/${book._id}`}>
            <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4 hover:border-gray-600 transition-colors cursor-pointer h-full">
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-white text-lg line-clamp-2">{book.title || 'Untitled'}</h3>
                  <p className="text-gray-300 text-sm">
                    {book.authors?.map(author => author.name || author).join(', ') || 'Unknown Author'}
                  </p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="text-gray-400">
                    <strong>ISBN:</strong> {book.isbn || 'N/A'}
                  </div>
                  <div className="text-gray-400">
                    <strong>Publisher:</strong> {book.publisher || 'Unknown'}
                  </div>
                  <div className="text-gray-400">
                    <strong>Category:</strong> {book.category?.name || book.genre || 'Uncategorized'}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(book.availableCopies, book.copies)}`}>
                    {book.availableCopies || 0} / {book.copies || 0} Available
                  </span>
                  <div className="text-xs text-gray-500">
                    {book.status === 'available' ? '📚 Available' : '🚫 Unavailable'}
                  </div>
                </div>

                {book.description && (
                  <p className="text-gray-400 text-xs line-clamp-2">
                    {book.description}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {!loading && books.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-lg mb-2">No books found</div>
          <div className="text-sm">
            {viewMode === 'search' ? 'Try a different search term' : 'Check back later for new additions'}
          </div>
        </div>
      )}
    </div>
  )
}
