import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { request } from '../lib/api'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Search, BookOpen, Users, TrendingUp, Filter, Grid, List } from 'lucide-react'

export default function Books(){
  const [books, setBooks] = useState([])
  const [popularBooks, setPopularBooks] = useState([])
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
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState('all') // all, popular, category
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [displayMode, setDisplayMode] = useState('grid') // grid, list

  useEffect(() => { 
    loadBooks()
    loadPopularBooks()
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

  async function loadBooksByCategory(categoryName) {
    if (!categoryName) return
    setLoading(true)
    try {
      const response = await request(`/books/search?genre=${encodeURIComponent(categoryName)}`)
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


  const handleCategoryChange = (categoryValue) => {
    setSelectedCategory(categoryValue)
    if (categoryValue && categoryValue !== 'all') {
      // Find the category name from the static list
      const category = categories.find(c => c._id === categoryValue)
      if (category) {
        loadBooksByCategory(category.name)
      }
    } else {
      loadBooks()
      setViewMode('all')
    }
  }


  const showPopular = () => {
    setBooks(popularBooks)
    setViewMode('popular')
    setSelectedCategory('all')
    setQuery('')
  }

  const showAll = () => {
    loadBooks()
    setViewMode('all')
    setSelectedCategory('all')
    setQuery('')
  }

  const getViewTitle = () => {
    switch (viewMode) {
      case 'popular': return 'Popular Books'
      case 'search': return `Search Results for "${query}"`
      case 'category': return `Books in ${categories.find(c => c._id === selectedCategory)?.name || 'Category'}`
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
    <div className="max-w-7xl mx-auto pt-4 space-y-4 min-w-[800px]">
      {/* Professional Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">
              Library Books
            </h1>
            <p className="text-lg text-gray-300 font-medium">
              Discover and explore our comprehensive collection
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={showAll} 
              variant={viewMode === 'all' ? 'default' : 'secondary'}
              className={`flex items-center gap-2 px-6 py-3 h-auto font-medium transition-all duration-200 hover:scale-105 ${
                viewMode === 'all' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              All Books
            </Button>
            <Button 
              onClick={showPopular} 
              variant={viewMode === 'popular' ? 'default' : 'secondary'}
              className={`flex items-center gap-2 px-6 py-3 h-auto font-medium transition-all duration-200 hover:scale-105 ${
                viewMode === 'popular' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <TrendingUp className="h-5 w-5" />
              Popular
            </Button>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-lg border border-red-400/50 bg-red-900/30 p-4 text-sm text-red-200 backdrop-blur-sm"
        >
          {error}
        </motion.div>
      )}
      
      {/* Professional Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="card-elevated border-gray-700/30">
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Enhanced Search */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search by title, author, ISBN..." 
                    value={query} 
                    onChange={e => setQuery(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && searchBooks()} 
                    className="pl-10 pr-4 py-2 input-field"
                  />
                </div>
                <Button 
                  onClick={searchBooks} 
                  disabled={loading}
                  className="w-full btn-primary py-2 text-sm font-semibold"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Searching...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Search className="h-4 w-4" />
                      Search Collection
                    </div>
                  )}
                </Button>
              </div>

              {/* Enhanced Category Filter */}
              <div className="space-y-3">
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="input-field py-2 text-sm">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600 rounded-lg">
                    <SelectItem value="all" className="text-sm py-2">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category._id} value={category._id} className="text-sm py-2">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Header */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-between items-center"
      >
        <div>
          <h2 className="text-xl font-semibold text-white">{getViewTitle()}</h2>
          <p className="text-gray-400 text-sm mt-1">
            {books.length} book{books.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={displayMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDisplayMode('grid')}
            className={displayMode === 'grid' ? 'btn-primary' : 'btn-secondary'}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={displayMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDisplayMode('list')}
            className={displayMode === 'list' ? 'btn-primary' : 'btn-secondary'}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
      
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <div className="text-gray-400 mt-4 text-lg">Loading books...</div>
        </motion.div>
      )}
      
      {/* Books Display */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={displayMode === 'grid' 
            ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
            : "space-y-3"
          }
        >
          {books.map((book, index) => (
            <motion.div
              key={book._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/books/${book._id}`}>
                <Card className="card group hover:scale-[1.02] transition-all duration-300 cursor-pointer h-full">
                  <CardContent className="p-4">
                    {displayMode === 'grid' ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <h3 className="font-bold text-white text-lg line-clamp-2 group-hover:text-blue-400 transition-colors leading-tight">
                            {book.title || 'Untitled'}
                          </h3>
                          <p className="text-gray-300 text-sm font-medium">
                            {book.authors || 'Unknown Author'}
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium">
                              {book.genre || 'Uncategorized'}
                            </Badge>
                            <Badge 
                              variant={book.availableCopies > 0 ? 'success' : 'destructive'}
                              className="text-xs px-2 py-0.5 font-medium"
                            >
                              {book.availableCopies || 0} / {book.copies || 0} Available
                            </Badge>
                          </div>
                          
                          <div className="bg-gray-800/50 p-3 rounded-lg space-y-1">
                            <div className="text-xs text-gray-300">
                              <span className="font-semibold text-gray-200">ISBN:</span> {book.isbn || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-300">
                              <span className="font-semibold text-gray-200">Publisher:</span> {book.publisher || 'Unknown'}
                            </div>
                          </div>

                          {book.description && (
                            <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                              {book.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <h3 className="font-bold text-white text-xl group-hover:text-blue-400 transition-colors leading-tight">
                            {book.title || 'Untitled'}
                          </h3>
                          <p className="text-gray-300 text-base font-medium">
                            by {book.authors || 'Unknown Author'}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium">{book.genre || 'Uncategorized'}</Badge>
                            <Badge 
                              variant={book.availableCopies > 0 ? 'success' : 'destructive'}
                              className="text-xs px-2 py-0.5 font-medium"
                            >
                              {book.availableCopies || 0} / {book.copies || 0} Available
                            </Badge>
                          </div>
                          {book.description && (
                            <p className="text-gray-400 text-sm line-clamp-2 mt-3 leading-relaxed">
                              {book.description}
                            </p>
                          )}
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg text-xs text-gray-300 space-y-1 min-w-[180px]">
                          <div><span className="font-semibold text-gray-200">ISBN:</span> {book.isbn || 'N/A'}</div>
                          <div><span className="font-semibold text-gray-200">Publisher:</span> {book.publisher || 'Unknown'}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
      
      {!loading && books.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="max-w-md mx-auto">
            <BookOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No books found</h3>
            <p className="text-gray-400">
              {viewMode === 'search' ? 'Try a different search term or browse all categories' : 'Check back later for new additions to our collection'}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
