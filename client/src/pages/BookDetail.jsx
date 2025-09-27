import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { request } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useAuth } from '../hooks/useAuth'
import { BookOpen, ArrowLeft, Star, Calendar, MapPin, Users, Clock, Shield, Award, BookMarked } from 'lucide-react'

export default function BookDetail(){
  const { id } = useParams()
  const { user } = useAuth()
  const [book, setBook] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function load(){ 
    setLoading(true)
    try{ 
      console.log('Loading book with ID:', id)
      const r = await request(`/books/${id}`)
      console.log('Book API response:', r)
      setBook(r.data?.book || null)
      setError('')
    }catch(e){ 
      console.error('Error loading book:', e)
      setError(e.message) 
    }
    finally {
      setLoading(false)
    }
  }
  
  useEffect(()=>{ 
    if (id) load() 
  },[id])

  const getAvailabilityColor = (available, total) => {
    const ratio = available / total
    if (ratio === 0) return 'text-red-400 bg-red-900/30'
    if (ratio < 0.3) return 'text-yellow-400 bg-yellow-900/30'
    return 'text-green-400 bg-green-900/30'
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-600'}>
        ★
      </span>
    ))
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <div className="text-gray-400 mt-4 text-lg">Loading book details...</div>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="text-center text-gray-400">
          <div className="text-2xl mb-4 font-semibold">Book not found</div>
          <div className="text-lg mb-6">{error}</div>
          <Link to="/books">
            <Button variant="secondary" className="btn-secondary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Books
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const averageRating = book.reviews?.length > 0 
    ? book.reviews.reduce((sum, review) => sum + review.rating, 0) / book.reviews.length 
    : 0

  return (
    <div className="max-w-6xl mx-auto pt-6 space-y-8 min-w-[800px]">
      {/* Professional Header */}
      <div className="flex items-center gap-6">
        <Link to="/books">
          <Button variant="secondary" className="btn-secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Books
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-white">Book Details</h1>
          <p className="text-xl text-gray-300 mt-2">Comprehensive information about this book</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/50 bg-red-900/30 p-4 text-sm text-red-200 backdrop-blur-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-400/50 bg-green-900/30 p-4 text-sm text-green-200 backdrop-blur-sm">
          {success}
        </div>
      )}

      {/* Main Book Information Card */}
      <div>
        <Card className="card-elevated border-gray-700/30">
          <CardContent className="p-8">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Book Cover */}
              <div className="lg:col-span-1">
                <div className="aspect-[3/4] bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center border border-gray-700 shadow-2xl">
                  <div className="text-center text-gray-400">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 text-blue-400" />
                    <div className="text-lg font-semibold">Book Cover</div>
                    <div className="text-sm text-gray-500">Cover image not available</div>
                  </div>
                </div>
              </div>

              {/* Book Details */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-3 leading-tight">{book.title}</h2>
                  <p className="text-xl text-gray-300 mb-6">
                    by {book.authors || 'Unknown Author'}
                  </p>
                  
                  <div className="flex flex-wrap gap-3 mb-6">
                    <Badge variant="secondary" className="text-sm px-4 py-2 font-medium">
                      {book.genre || 'Uncategorized'}
                    </Badge>
                    <Badge 
                      variant={book.availableCopies > 0 ? 'success' : 'destructive'}
                      className="text-sm px-4 py-2 font-medium"
                    >
                      {book.availableCopies || 0} / {book.copies || 0} Available
                    </Badge>
                    {book.reviews?.length > 0 && (
                      <Badge variant="outline" className="text-sm px-4 py-2 font-medium">
                        <Star className="h-3 w-3 mr-1" />
                        {averageRating.toFixed(1)} ({book.reviews.length} reviews)
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Key Information Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <BookMarked className="h-4 w-4 text-blue-400" />
                      <label className="text-sm font-semibold text-gray-300">ISBN</label>
                    </div>
                    <div className="text-white font-mono text-sm">{book.isbn || 'Not available'}</div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-4 w-4 text-purple-400" />
                      <label className="text-sm font-semibold text-gray-300">Publisher</label>
                    </div>
                    <div className="text-white">{book.publisher || 'Unknown'}</div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-green-400" />
                      <label className="text-sm font-semibold text-gray-300">Publication Year</label>
                    </div>
                    <div className="text-white">{book.publicationYear || 'Unknown'}</div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-orange-400" />
                      <label className="text-sm font-semibold text-gray-300">Language</label>
                    </div>
                    <div className="text-white">{book.language || 'English'}</div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-yellow-400" />
                      <label className="text-sm font-semibold text-gray-300">Pages</label>
                    </div>
                    <div className="text-white">{book.pages || 'Unknown'}</div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-red-400" />
                      <label className="text-sm font-semibold text-gray-300">Location</label>
                    </div>
                    <div className="text-white">
                      {book.location && typeof book.location === 'object' 
                        ? `${book.location.shelf || 'Unknown'}, ${book.location.section || 'Unknown'}, Floor ${book.location.floor || 'Unknown'}`
                        : book.location || 'Main Library'
                      }
                    </div>
                  </div>
                </div>

                {/* Description */}
                {book.description && (
                  <div className="bg-gray-800/30 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                    <p className="text-gray-200 leading-relaxed">{book.description}</p>
                  </div>
                )}

                {/* Rating Section */}
                {book.reviews?.length > 0 && (
                  <div className="bg-gray-800/30 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-3">Rating & Reviews</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="flex">{renderStars(Math.round(averageRating))}</div>
                        <span className="text-white font-bold text-xl">{averageRating.toFixed(1)}</span>
                      </div>
                      <span className="text-gray-400">({book.reviews.length} review{book.reviews.length !== 1 ? 's' : ''})</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <div>
        <Card className="card-elevated border-gray-700/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white text-xl font-semibold">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Book ID</label>
                <div className="text-white font-mono text-sm break-all">{book._id}</div>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Status</label>
                <div className="text-white">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    book.isActive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                  }`}>
                    {book.isActive ? '✅ Active' : '❌ Inactive'}
                  </span>
                </div>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Borrowing Status</label>
                <div className="text-white">
                  {book.availableCopies > 0 ? (
                    <span className="text-green-400">📚 Available for borrowing</span>
                  ) : (
                    <span className="text-red-400">🚫 Currently unavailable</span>
                  )}
                </div>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Last Updated</label>
                <div className="text-white">
                  {book.updatedAt ? new Date(book.updatedAt).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Shelf Location</label>
                <div className="text-white">
                  {book.shelfLocation || 
                   (book.location && typeof book.location === 'object' 
                     ? `${book.location.shelf || 'Unknown'}, ${book.location.section || 'Unknown'}, Floor ${book.location.floor || 'Unknown'}`
                     : book.location || 'Main Library - General Section'
                   )
                  }
                </div>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Condition</label>
                <div className="text-white">{book.condition || 'Good'}</div>
              </div>
            </div>

            {/* Borrowing Guidelines */}
            <div className="mt-8 p-6 bg-blue-900/20 border border-blue-700/50 rounded-xl">
              <h4 className="text-lg font-semibold text-blue-300 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Borrowing Guidelines
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 text-sm text-blue-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Maximum borrowing period: 14 days
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Renewal allowed: Up to 2 times
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Late return fine: $0.50 per day
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Maximum books per user: 5 books
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews Section */}
      <div>
        <Card className="card-elevated border-gray-700/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white text-xl font-semibold">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Star className="h-5 w-5 text-yellow-400" />
              </div>
              Reviews ({book.reviews?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {book.reviews?.length > 0 ? (
              <div className="space-y-6">
                {book.reviews.map((review, index) => (
                  <div
                    key={index}
                    className="bg-gray-800/30 border border-gray-700 rounded-lg p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex">{renderStars(review.rating)}</div>
                        <span className="text-white font-semibold">{review.rating}/5</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {review.user?.name || 'Anonymous'} • {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recently'}
                      </div>
                    </div>
                    <p className="text-gray-200 leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Star className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <div className="text-xl mb-2 font-semibold">No reviews yet</div>
                <div className="text-lg">Be the first to review this book!</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}