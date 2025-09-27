import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { request } from '../lib/api'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { useAuth } from '../hooks/useAuth'

export default function BookDetail(){
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [book, setBook] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)

  async function load(){ 
    setLoading(true)
    try{ 
      const r = await request(`/books/${id}`)
      setBook(r.data?.book || null)
      setError('')
    }catch(e){ 
      setError(e.message) 
    }
    finally {
      setLoading(false)
    }
  }
  
  useEffect(()=>{ 
    if (id) load() 
  },[id])

  async function addReview(){ 
    if (!comment.trim()) {
      setError('Please enter a comment for your review')
      return
    }
    
    setReviewLoading(true)
    try{ 
      await request(`/books/${id}/reviews`, { 
        method: 'POST', 
        body: JSON.stringify({ rating: Number(rating), comment: comment.trim() }) 
      })
      setComment('')
      setRating(5)
      setSuccess('Review added successfully!')
      await load() 
    }catch(e){ 
      setError(e.message) 
    }
    finally {
      setReviewLoading(false)
    }
  }

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
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <div className="text-gray-400 mt-2">Loading book details...</div>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center text-gray-400">
          <div className="text-lg mb-2">Book not found</div>
          <div className="text-sm mb-4">{error}</div>
          <Link to="/books">
            <Button variant="secondary">← Back to Books</Button>
          </Link>
        </div>
      </div>
    )
  }

  const averageRating = book.reviews?.length > 0 
    ? book.reviews.reduce((sum, review) => sum + review.rating, 0) / book.reviews.length 
    : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/books">
          <Button variant="secondary">← Back to Books</Button>
        </Link>
        <h1 className="text-3xl font-bold text-white">Book Details</h1>
      </div>

      {error && <div className="rounded-md border border-red-400 bg-red-900/30 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-md border border-green-400 bg-green-900/30 p-3 text-sm text-green-200">{success}</div>}

      {/* Book Information */}
      <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Book Cover Placeholder */}
          <div className="md:col-span-1">
            <div className="aspect-[3/4] bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">📚</div>
                <div className="text-sm">Book Cover</div>
              </div>
            </div>
          </div>

          {/* Book Details */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{book.title}</h2>
              <p className="text-lg text-gray-300">
                by {book.authors?.map(author => author.name || author).join(', ') || 'Unknown Author'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-300">ISBN</label>
                <div className="text-white">{book.isbn || 'Not available'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Publisher</label>
                <div className="text-white">{book.publisher || 'Unknown'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Category</label>
                <div className="text-white">{book.category?.name || book.genre || 'Uncategorized'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Publication Year</label>
                <div className="text-white">{book.publicationYear || 'Unknown'}</div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getAvailabilityColor(book.availableCopies, book.copies)}`}>
                {book.availableCopies || 0} / {book.copies || 0} Available
              </span>
              <div className="text-sm text-gray-400">
                {book.status === 'available' ? '📚 Available for borrowing' : '🚫 Currently unavailable'}
              </div>
            </div>

            {/* Rating */}
            {book.reviews?.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex">{renderStars(Math.round(averageRating))}</div>
                <span className="text-white font-medium">{averageRating.toFixed(1)}</span>
                <span className="text-gray-400 text-sm">({book.reviews.length} review{book.reviews.length !== 1 ? 's' : ''})</span>
              </div>
            )}

            {book.description && (
              <div>
                <label className="text-sm font-medium text-gray-300">Description</label>
                <p className="text-white mt-1 leading-relaxed">{book.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Review Section */}
      {user && (
        <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Add Your Review</h3>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-gray-200">Rating</Label>
                <select 
                  className="h-10 px-3 rounded-md border border-gray-700 bg-[#020617]/50 text-gray-200 text-sm w-full"
                  value={rating} 
                  onChange={e => setRating(Number(e.target.value))}
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Very Good</option>
                  <option value={3}>3 - Good</option>
                  <option value={2}>2 - Fair</option>
                  <option value={1}>1 - Poor</option>
                </select>
              </div>
              <div className="flex items-center">
                <div className="flex text-2xl">{renderStars(rating)}</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-200">Comment</Label>
              <textarea 
                className="min-h-20 px-3 py-2 rounded-md border border-gray-700 bg-[#020617]/50 text-gray-200 text-sm w-full"
                placeholder="Share your thoughts about this book..."
                value={comment} 
                onChange={e => setComment(e.target.value)}
                rows={3}
              />
            </div>
            
            <Button 
              onClick={addReview} 
              disabled={reviewLoading || !comment.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {reviewLoading ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          Reviews ({book.reviews?.length || 0})
        </h3>
        
        {book.reviews?.length > 0 ? (
          <div className="space-y-4">
            {book.reviews.map((review, index) => (
              <div key={index} className="border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">{renderStars(review.rating)}</div>
                    <span className="text-white font-medium">{review.rating}/5</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {review.user?.name || 'Anonymous'} • {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recently'}
                  </div>
                </div>
                <p className="text-gray-200">{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-lg mb-2">No reviews yet</div>
            <div className="text-sm">Be the first to review this book!</div>
          </div>
        )}
      </div>
    </div>
  )
}
