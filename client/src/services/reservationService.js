import { request } from '../lib/api'

export const reservationService = {
  // Get all reservations (Admin/Librarian)
  getAllReservations: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `/reservations?${queryString}` : '/reservations'
    return await request(url)
  },

  // Create reservation (Private)
  createReservation: async (reservationData) => {
    return await request('/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData)
    })
  },

  // Get single reservation (Admin/Librarian/Own)
  getReservation: async (reservationId) => {
    return await request(`/reservations/${reservationId}`)
  },

  // Update reservation (Admin/Librarian)
  updateReservation: async (reservationId, updateData) => {
    return await request(`/reservations/${reservationId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    })
  },

  // Cancel reservation (Admin/Librarian/Own)
  cancelReservation: async (reservationId) => {
    return await request(`/reservations/${reservationId}`, {
      method: 'DELETE'
    })
  },

  // Get user's reservations
  getUserReservations: async (userId) => {
    return await request(`/reservations?userId=${userId}`)
  },

  // Helper functions for reservation management
  formatReservationStatus: (status) => {
    const statusMap = {
      'pending': { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
      'fulfilled': { label: 'Fulfilled', color: 'bg-green-100 text-green-800', icon: '✅' },
      'expired': { label: 'Expired', color: 'bg-red-100 text-red-800', icon: '❌' },
      'cancelled': { label: 'Cancelled', color: 'bg-gray-800 text-gray-200', icon: '🚫' }
    }
    return statusMap[status] || { label: status, color: 'bg-gray-800 text-gray-200', icon: '❓' }
  },

  getPriorityLevel: (reservationDate) => {
    const daysSinceReservation = Math.floor((new Date() - new Date(reservationDate)) / (1000 * 60 * 60 * 24))
    if (daysSinceReservation >= 7) return { level: 'high', label: 'High Priority', color: 'text-red-600' }
    if (daysSinceReservation >= 3) return { level: 'medium', label: 'Medium Priority', color: 'text-yellow-600' }
    return { level: 'low', label: 'Low Priority', color: 'text-green-600' }
  },

  isExpired: (expirationDate) => {
    return new Date() > new Date(expirationDate)
  },

  getDaysUntilExpiration: (expirationDate) => {
    const expiration = new Date(expirationDate)
    const today = new Date()
    const diffTime = expiration - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  },

  canFulfill: (reservation) => {
    return reservation.status === 'pending' && !reservationService.isExpired(reservation.expirationDate)
  },

  canCancel: (reservation, userRole, userId) => {
    // Admin/Librarian can cancel any reservation
    if (userRole === 'admin' || userRole === 'librarian') return true
    // Users can cancel their own pending reservations
    return reservation.userId === userId && reservation.status === 'pending'
  }
}

export default reservationService
