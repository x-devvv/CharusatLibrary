import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../lib/api'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'

export default function AdminUsers(){
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', role:'member' })
  const [editingUser, setEditingUser] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  async function load(){ 
    setLoading(true)
    try{ 
      const r = await request('/users'); 
      setUsers(r.data?.users||[])
      setError('')
    }catch(e){ 
      console.error('Users load error:', e)
      setError(e.message) 
    }
    finally { setLoading(false) }
  }
  
  useEffect(()=>{ load() },[])

  async function createUser(){
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Name, email, and password are required')
      return
    }
    
    try{ 
      await request('/users', { method:'POST', body: JSON.stringify(form) }); 
      setForm({name:'',email:'',password:'',phone:'',role:'member'}); 
      setError('');
      setSuccess('User created successfully!');
      await load() 
    }
    catch(e){ setError(e.message) }
  }

  async function updateUser(){
    if (!editingUser || !editingUser.name.trim() || !editingUser.email.trim()) {
      setError('Name and email are required')
      return
    }
    
    try{ 
      const updateData = { ...editingUser }
      delete updateData._id
      delete updateData.__v
      delete updateData.createdAt
      delete updateData.updatedAt
      delete updateData.refreshTokens
      delete updateData.lastLogin
      delete updateData.membershipDate
      
      await request(`/users/${editingUser._id}`, { 
        method:'PUT', 
        body: JSON.stringify(updateData) 
      }); 
      setEditingUser(null);
      setError('');
      setSuccess('User updated successfully!');
      await load() 
    }
    catch(e){ setError(e.message) }
  }

  async function deleteUser(userId){
    try{ 
      await request(`/users/${userId}`, { method:'DELETE' }); 
      setDeleteConfirm(null);
      setError('');
      setSuccess('User deleted successfully!');
      await load() 
    }
    catch(e){ setError(e.message) }
  }

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return 'text-red-400 bg-red-900/30'
      case 'librarian': return 'text-blue-400 bg-blue-900/30'
      case 'member': return 'text-green-400 bg-green-900/30'
      default: return 'text-gray-400 bg-gray-900/30'
    }
  }

  const handleEditChange = (field, value) => {
    setEditingUser(prev => ({ ...prev, [field]: value }))
  }

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <Button onClick={load} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && <div className="rounded-md border border-red-400 bg-red-900/30 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-md border border-green-400 bg-green-900/30 p-3 text-sm text-green-200">{success}</div>}
      
      {/* Create User Form */}
      <div className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Create New User</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label className="text-gray-200">Name</Label>
            <Input 
              placeholder="Full Name" 
              value={form.name} 
              onChange={e=>handleFormChange('name', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-200">Email</Label>
            <Input 
              placeholder="Email Address" 
              type="email" 
              value={form.email} 
              onChange={e=>handleFormChange('email', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-200">Password</Label>
            <Input 
              placeholder="Password" 
              type="password" 
              value={form.password} 
              onChange={e=>handleFormChange('password', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-200">Phone</Label>
            <Input 
              placeholder="Phone Number" 
              value={form.phone} 
              onChange={e=>handleFormChange('phone', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-200">Role</Label>
            <select 
              className="h-10 px-3 rounded-md border border-gray-700 bg-[#020617]/50 text-gray-200 text-sm w-full"
              value={form.role} 
              onChange={e=>handleFormChange('role', e.target.value)}
            >
              <option value="member">Member</option>
              <option value="librarian">Librarian</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <Button onClick={createUser} disabled={loading} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
          {loading ? 'Creating...' : 'Create User'}
        </Button>
      </div>
      
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
        </div>
      )}
      
      {/* Users List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users.map(u=> (
          <div key={u._id} className="bg-[#020617]/30 backdrop-blur-sm rounded-lg border border-gray-800 p-4 space-y-3">
            {editingUser && editingUser._id === u._id ? (
              // Edit Mode
              <div className="space-y-3">
                <Input 
                  value={editingUser.name} 
                  onChange={e=>handleEditChange('name', e.target.value)}
                  placeholder="Name"
                />
                <Input 
                  value={editingUser.email} 
                  onChange={e=>handleEditChange('email', e.target.value)}
                  placeholder="Email"
                  type="email"
                />
                <Input 
                  value={editingUser.phone || ''} 
                  onChange={e=>handleEditChange('phone', e.target.value)}
                  placeholder="Phone"
                />
                <select 
                  className="h-10 px-3 rounded-md border border-gray-700 bg-[#020617]/50 text-gray-200 text-sm w-full"
                  value={editingUser.role} 
                  onChange={e=>handleEditChange('role', e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="librarian">Librarian</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="flex gap-2">
                  <Button onClick={updateUser} size="sm" className="bg-green-600 hover:bg-green-700">
                    Save
                  </Button>
                  <Button onClick={() => setEditingUser(null)} size="sm" variant="secondary">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              // View Mode
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-lg text-white">{u.name}</div>
                    <div className="text-sm text-gray-300">{u.email}</div>
                    {u.phone && <div className="text-sm text-gray-400">{u.phone}</div>}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(u.role)}`}>
                    {u.role?.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="text-gray-400">
                    {u.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                  </div>
                  {u.lastLogin && (
                    <div className="text-gray-500">
                      Last: {new Date(u.lastLogin).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Link to={`/admin/users/${u._id}`}>
                    <Button size="sm" variant="secondary">
                      View Details
                    </Button>
                  </Link>
                  <Button 
                    onClick={() => setEditingUser(u)} 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Edit
                  </Button>
                  <Button 
                    onClick={() => setDeleteConfirm(u._id)} 
                    size="sm" 
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      
      {!loading && users.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-lg mb-2">No users found</div>
          <div className="text-sm">Create your first user to get started.</div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#020617]/95 backdrop-blur-md border border-gray-700 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Delete</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={() => deleteUser(deleteConfirm)} 
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
