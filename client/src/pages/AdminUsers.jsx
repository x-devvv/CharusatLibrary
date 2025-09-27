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
import { 
  Users, UserPlus, Edit, Trash2, Search, Filter, Download, 
  Mail, Phone, Calendar, Shield, UserCheck, Grid, List,
  RefreshCw, CheckCircle, XCircle, AlertTriangle, Eye
} from 'lucide-react'

export default function AdminUsers(){
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', role:'student' })
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
      setForm({name:'',email:'',password:'',phone:'',role:'student'}); 
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
      case 'student': return 'text-purple-400 bg-purple-900/30'
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
    <div className="max-w-7xl mx-auto space-y-8 min-w-[1000px]">
      {/* Professional Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold text-white">
              User Management
            </h1>
            <p className="text-xl text-gray-300 font-medium">
              Comprehensive administration of library user accounts and permissions
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Active Users</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Role Management</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Secure Access</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={load} 
              disabled={loading}
              variant="outline" 
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            <Button 
              variant="outline" 
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Alerts */}
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-red-500/10 rounded-xl blur-sm"></div>
          <div className="relative bg-red-900/20 backdrop-blur-sm border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-200">{error}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-green-500/10 rounded-xl blur-sm"></div>
          <div className="relative bg-green-900/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-200">{success}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Create User Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="card-elevated border-gray-700/30">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-white text-xl font-semibold">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <UserPlus className="h-5 w-5 text-blue-400" />
              </div>
              Create New User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label className="text-gray-200 font-semibold">Name</Label>
                <Input 
                  placeholder="Full Name" 
                  value={form.name} 
                  onChange={e=>handleFormChange('name', e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200 font-semibold">Email</Label>
                <Input 
                  placeholder="Email Address" 
                  type="email" 
                  value={form.email} 
                  onChange={e=>handleFormChange('email', e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200 font-semibold">Password</Label>
                <Input 
                  placeholder="Password" 
                  type="password" 
                  value={form.password} 
                  onChange={e=>handleFormChange('password', e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200 font-semibold">Phone</Label>
                <Input 
                  placeholder="Phone Number" 
                  value={form.phone} 
                  onChange={e=>handleFormChange('phone', e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200 font-semibold">Role</Label>
                <Select value={form.role} onValueChange={(value) => handleFormChange('role', value)}>
                  <SelectTrigger className="input-field">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600 rounded-lg">
                    <SelectItem value="member" className="text-base py-3">Member</SelectItem>
                    <SelectItem value="librarian" className="text-base py-3">Librarian</SelectItem>
                    <SelectItem value="admin" className="text-base py-3">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={createUser} 
              disabled={loading} 
              className="mt-6 btn-primary w-full py-3 text-base font-semibold"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                  Creating...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Create User
                </div>
              )}
            </Button>
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
          <h2 className="text-2xl font-semibold text-white">All Users</h2>
          <p className="text-gray-400 text-sm mt-1">
            {users.length} user{users.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="btn-primary"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="btn-secondary"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-gray-800/20 to-gray-700/20 rounded-2xl blur-sm"></div>
          <div className="relative bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-12">
            <div className="text-center space-y-4">
              <div className="relative">
                <RefreshCw className="h-12 w-12 mx-auto text-blue-400 animate-spin" />
                <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-lg"></div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-200">Loading users...</p>
                <p className="text-sm text-gray-400">Please wait while we fetch the latest data</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Users List */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {users.map((u, index) => (
            <motion.div
              key={u._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="card group hover:scale-[1.02] transition-all duration-300 h-full">
                <CardContent className="p-6">
                  {editingUser && editingUser._id === u._id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <Input 
                        value={editingUser.name} 
                        onChange={e=>handleEditChange('name', e.target.value)}
                        placeholder="Name"
                        className="input-field"
                      />
                      <Input 
                        value={editingUser.email} 
                        onChange={e=>handleEditChange('email', e.target.value)}
                        placeholder="Email"
                        type="email"
                        className="input-field"
                      />
                      <Input 
                        value={editingUser.phone || ''} 
                        onChange={e=>handleEditChange('phone', e.target.value)}
                        placeholder="Phone"
                        className="input-field"
                      />
                      <Select value={editingUser.role} onValueChange={(value) => handleEditChange('role', value)}>
                        <SelectTrigger className="input-field">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600 rounded-lg">
                          <SelectItem value="member" className="text-base py-3">Member</SelectItem>
                          <SelectItem value="librarian" className="text-base py-3">Librarian</SelectItem>
                          <SelectItem value="admin" className="text-base py-3">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 pt-2">
                        <Button onClick={updateUser} size="sm" className="btn-primary flex-1">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button onClick={() => setEditingUser(null)} size="sm" variant="secondary" className="btn-secondary flex-1">
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">
                            {u.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-300">{u.email}</span>
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-2 mt-1">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-400">{u.phone}</span>
                            </div>
                          )}
                        </div>
                        <Badge className={`px-3 py-1 text-xs font-medium ${getRoleColor(u.role)}`}>
                          {u.role?.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="bg-gray-800/50 p-4 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                            <span className="text-gray-300">
                              {u.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {u.lastLogin && (
                            <div className="flex items-center gap-1 text-gray-400">
                              <Calendar className="h-3 w-3" />
                              <span className="text-xs">
                                {new Date(u.lastLogin).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Link to={`/admin/users/${u._id}`} className="flex-1">
                          <Button size="sm" variant="outline" className="btn-secondary w-full">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Button 
                          onClick={() => setEditingUser(u)} 
                          size="sm" 
                          className="btn-primary flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          onClick={() => setDeleteConfirm(u._id)} 
                          size="sm" 
                          className="btn-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
      
      {!loading && users.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-gray-800/20 to-gray-700/20 rounded-2xl blur-sm"></div>
          <div className="relative bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-12">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <div className="absolute inset-0 bg-gray-400/10 rounded-full blur-lg"></div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-200">No users found</p>
                <p className="text-sm text-gray-400">Create your first user to get started</p>
              </div>
            </div>
          </div>
        </motion.div>
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
