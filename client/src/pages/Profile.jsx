import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { request } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import ChangePassword from '../components/ChangePassword'
import { 
  User, Mail, Phone, MapPin, Calendar, Shield, Edit, Save, X, 
  CheckCircle, XCircle, RefreshCw, UserCheck, Settings
} from 'lucide-react'

export default function Profile(){
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  })

  useEffect(()=>{ loadProfile() },[])

  async function loadProfile() {
    try{ 
      const r = await request('/auth/profile')
      setUser(r.data?.user)
      setFormData({
        name: r.data?.user?.name || '',
        phone: r.data?.user?.phone || '',
        address: {
          street: r.data?.user?.address?.street || '',
          city: r.data?.user?.address?.city || '',
          state: r.data?.user?.address?.state || '',
          zipCode: r.data?.user?.address?.zipCode || '',
          country: r.data?.user?.address?.country || ''
        }
      })
    }catch(e){ 
      setError(e.message) 
    }
  }

  const handleChange = (field, value) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [addressField]: value }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  async function updateProfile(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(formData)
      })
      
      setSuccess('Profile updated successfully!')
      setEditing(false)
      await loadProfile()
    } catch (err) {
      setError(err.message)
    }
    finally {
      setLoading(false)
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 min-w-[800px]">
      {/* Professional Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold text-white">
              User Profile
            </h1>
            <p className="text-xl text-gray-300 font-medium">
              Manage your personal information and account settings
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Account Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Secure Profile</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="font-medium">Personalized</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setEditing(!editing)}
              variant="outline" 
              className="btn-secondary flex items-center space-x-2"
            >
              {editing ? (
                <>
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4" />
                  <span>Edit Profile</span>
                </>
              )}
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
      
      {/* Profile Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="card-elevated border-gray-700/30">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-white text-xl font-semibold">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <User className="h-5 w-5 text-blue-400" />
              </div>
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>

        {!editing ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Name</label>
                <div className="text-white text-lg">{user?.name || '-'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Email</label>
                <div className="text-white">{user?.email || '-'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Phone</label>
                <div className="text-white">{user?.phone || 'Not provided'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Role</label>
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user?.role)}`}>
                    {user?.role?.toUpperCase() || '-'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Status</label>
                <div className="text-white">
                  {user?.status === 'active' ? (
                    <span className="text-green-400">🟢 Active</span>
                  ) : (
                    <span className="text-red-400">🔴 {user?.status || 'Unknown'}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Member Since</label>
                <div className="text-white">
                  {user?.membershipDate ? new Date(user.membershipDate).toLocaleDateString() : '-'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Address</label>
                <div className="text-white text-sm">
                  {user?.fullAddress || 'Not provided'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={updateProfile} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-200">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  className="h-10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-200">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Address</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="street" className="text-gray-200">Street Address</Label>
                  <Input
                    id="street"
                    value={formData.address.street}
                    onChange={e => handleChange('address.street', e.target.value)}
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-gray-200">City</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={e => handleChange('address.city', e.target.value)}
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-gray-200">State</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={e => handleChange('address.state', e.target.value)}
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="zipCode" className="text-gray-200">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.address.zipCode}
                    onChange={e => handleChange('address.zipCode', e.target.value)}
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-gray-200">Country</Label>
                  <Input
                    id="country"
                    value={formData.address.country}
                    onChange={e => handleChange('address.country', e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing(false)}
                className="btn-secondary"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Change Password Section */}
      <ChangePassword />
    </div>
  )
}
