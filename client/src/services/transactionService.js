import { request } from '../lib/api'

export const transactionService = {
  // Get all transactions (Admin/Librarian)
  getAllTransactions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `/transactions?${queryString}` : '/transactions'
    return await request(url)
  },

  // Get overdue transactions (Admin/Librarian)
  getOverdueTransactions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `/transactions/overdue?${queryString}` : '/transactions/overdue'
    return await request(url)
  },

  // Get transaction statistics (Admin/Librarian)
  getTransactionStats: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `/transactions/stats?${queryString}` : '/transactions/stats'
    return await request(url)
  },

  // Get user's active transactions (Admin/Librarian/Own)
  getUserActiveTransactions: async (userId) => {
    return await request(`/transactions/user/${userId}/active`)
  },

  // Borrow book (Private)
  borrowBook: async (bookId, borrowData = {}) => {
    return await request('/transactions/borrow', {
      method: 'POST',
      body: JSON.stringify({ bookId, ...borrowData })
    })
  },

  // Return book (Admin/Librarian)
  returnBook: async (transactionId, returnData = {}) => {
    return await request(`/transactions/${transactionId}/return`, {
      method: 'PUT',
      body: JSON.stringify(returnData)
    })
  },

  // Renew book (Private)
  renewBook: async (transactionId, renewData = {}) => {
    return await request(`/transactions/${transactionId}/renew`, {
      method: 'PUT',
      body: JSON.stringify(renewData)
    })
  },

  // Pay fine (Private)
  payFine: async (transactionId, paymentData = {}) => {
    return await request(`/transactions/${transactionId}/pay-fine`, {
      method: 'PUT',
      body: JSON.stringify(paymentData)
    })
  },

  // Get single transaction (Admin/Librarian/Own)
  getTransaction: async (transactionId) => {
    return await request(`/transactions/${transactionId}`)
  },

  // Helper functions for transaction management
  calculateFine: (dueDate, returnDate = new Date()) => {
    const due = new Date(dueDate)
    const returned = new Date(returnDate)
    const diffTime = returned - due
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays * 2 : 0 // $2 per day fine
  },

  formatTransactionStatus: (status) => {
    const statusMap = {
      'borrowed': { label: 'Borrowed', color: 'bg-blue-100 text-blue-800' },
      'returned': { label: 'Returned', color: 'bg-green-100 text-green-800' },
      'overdue': { label: 'Overdue', color: 'bg-red-100 text-red-800' },
      'renewed': { label: 'Renewed', color: 'bg-yellow-100 text-yellow-800' }
    }
    return statusMap[status] || { label: status, color: 'bg-gray-800 text-gray-200' }
  },

  isOverdue: (dueDate) => {
    return new Date() > new Date(dueDate)
  },

  getDaysUntilDue: (dueDate) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }
}

export default transactionService
