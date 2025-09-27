import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { request } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [userHistory, setUserHistory] = useState([])
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (id) {
      loadUser()
      loadUserHistory()
    }
  }, [id])

  async function loadUser() {
    setLoading(true)
    try {
      const response = await request(`/users/${id}`)
      setUser(response.data?.user)
      setEditForm(response.data?.user || {})
      setError('')
    } catch (e) {
      setError(e.message)
    }
    finally {
      setLoading(false)
    }
  }

  async function loadUserHistory() {
    setHistoryLoading(true)
    try {
      const response = await request(`/users/${id}/history`)
      setUserHistory(response.data?.history || [])
    } catch (e) {
      console.error('History load error:', e)
      // Don't show error for history as it might not be accessible
    }
    finally {
      setHistoryLoading(false)
    }
  }

  async function updateUser() {
    if (!editForm.name?.trim() || !editForm.email?.trim()) {
      setError('Name and email are required')
      return
    }

    try {
      const updateData = { ...editForm }
      delete updateData._id
      delete updateData.__v
      delete updateData.createdAt
      delete updateData.updatedAt
      delete updateData.refreshTokens
      delete updateData.lastLogin
      delete updateData.membershipDate

      await request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })

      setSuccess('User updated successfully!')
      setEditing(false)
      await loadUser()
    } catch (e) {
      setError(e.message)
    }
  }

  async function deleteUser() {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await request(`/users/${id}`, { method: 'DELETE' })
        navigate('/admin/users')
      } catch (e) {
        setError(e.message)
      }
    }
  }

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return 'text-red-400 bg-red-900/30'
      case 'librarian': return 'text-blue-400 bg-blue-900/30'
      case 'member': return 'text-green-400 bg-green-900/30'
      case 'student': return 'text-purple-400 bg-purple-900/30'
      default: return 'text-gray-400 bg-gray-900/30'
    }
  }

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <div className="text-gray-400 mt-2">Loading user details...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center text-gray-400">
          <div className="text-lg mb-2">User not found</div>
          <Link to="/admin/users">
            <Button variant="secondary">Back to Users</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pt-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/admin/users">
            <Button variant="secondary">← Back to Users</Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">User Details</h1>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <Button onClick={() => setEditing(true)} className="btn-primary">
              Edit User
            </Button>
          )}
          <Button onClick={deleteUser} className="btn-destructive">
            Delete User
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-400 bg-red-900/30 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-md border border-green-400 bg-green-900/30 p-3 text-sm text-green-200">{success}</div>}

      {/* User Information */}
      <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">User Information</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
            {user.role?.toUpperCase()}
          </span>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-gray-200">Name</Label>
                <Input
                  value={editForm.name || ''}
                  onChange={e => handleEditChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Email</Label>
                <Input
                  type="email"
                  value={editForm.email || ''}
                  onChange={e => handleEditChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Phone</Label>
                <Input
                  value={editForm.phone || ''}
                  onChange={e => handleEditChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Role</Label>
                <select
                  className="h-10 px-3 rounded-md border border-gray-700 bg-[#020617]/50 text-gray-200 text-sm w-full"
                  value={editForm.role || 'student'}
                  onChange={e => handleEditChange('role', e.target.value)}
                >
                  <option value="student">Student</option>
                  <option value="member">Member</option>
                  <option value="librarian">Librarian</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Address</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-gray-200">Street</Label>
                  <Input
                    value={editForm.address?.street || ''}
                    onChange={e => handleEditChange('address', { ...editForm.address, street: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-200">City</Label>
                  <Input
                    value={editForm.address?.city || ''}
                    onChange={e => handleEditChange('address', { ...editForm.address, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-200">State</Label>
                  <Input
                    value={editForm.address?.state || ''}
                    onChange={e => handleEditChange('address', { ...editForm.address, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-200">ZIP Code</Label>
                  <Input
                    value={editForm.address?.zipCode || ''}
                    onChange={e => handleEditChange('address', { ...editForm.address, zipCode: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={updateUser} className="btn-success">
                Save Changes
              </Button>
              <Button onClick={() => setEditing(false)} variant="secondary" className="btn-secondary">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Name</label>
                <div className="text-white text-lg">{user.name}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Email</label>
                <div className="text-white">{user.email}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Phone</label>
                <div className="text-white">{user.phone || 'Not provided'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Status</label>
                <div className="text-white">
                  {user.status === 'active' ? (
                    <span className="text-green-400">🟢 Active</span>
                  ) : (
                    <span className="text-red-400">🔴 {user.status}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Member Since</label>
                <div className="text-white">
                  {user.membershipDate ? new Date(user.membershipDate).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Last Login</label>
                <div className="text-white">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Address</label>
                <div className="text-white text-sm">
                  {user.fullAddress || 'Not provided'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Email Verified</label>
                <div className="text-white">
                  {user.emailVerified ? (
                    <span className="text-green-400">✅ Verified</span>
                  ) : (
                    <span className="text-yellow-400">⚠️ Not Verified</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User History */}
      <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Transaction History</h2>
        
        {historyLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
          </div>
        ) : userHistory.length > 0 ? (
          <div className="space-y-3">
            {userHistory.map((transaction, index) => (
              <div key={index} className="border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-white">{transaction.bookTitle || 'Unknown Book'}</div>
                    <div className="text-sm text-gray-400">
                      Borrowed: {transaction.borrowDate ? new Date(transaction.borrowDate).toLocaleDateString() : 'Unknown'}
                    </div>
                    {transaction.returnDate && (
                      <div className="text-sm text-gray-400">
                        Returned: {new Date(transaction.returnDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    transaction.status === 'returned' ? 'text-green-400 bg-green-900/30' :
                    transaction.status === 'overdue' ? 'text-red-400 bg-red-900/30' :
                    'text-blue-400 bg-blue-900/30'
                  }`}>
                    {transaction.status?.toUpperCase()}
                  </span>
                </div>
                {transaction.fineAmount > 0 && (
                  <div className="text-sm text-red-400 mt-2">
                    Fine: ${transaction.fineAmount}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-lg mb-2">No transaction history</div>
            <div className="text-sm">This user hasn't borrowed any books yet.</div>
          </div>
        )}
      </div>
    </div>
  )
}
