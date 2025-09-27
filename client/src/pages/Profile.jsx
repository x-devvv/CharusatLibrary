import { useEffect, useState } from 'react'
import { request } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import ChangePassword from '../components/ChangePassword'

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
      default: return 'text-gray-400 bg-gray-900/30'
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {error && <div className="rounded-md border border-red-400 bg-red-900/30 p-3 text-sm text-red-200">{error}</div>}
      {success && <div className="rounded-md border border-green-400 bg-green-900/30 p-3 text-sm text-green-200">{success}</div>}
      
      {/* Profile Information */}
      <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Profile Information</h2>
          <Button
            onClick={() => setEditing(!editing)}
            variant={editing ? "secondary" : "default"}
            className={editing ? "" : "bg-indigo-600 hover:bg-indigo-700"}
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>

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
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Change Password Section */}
      <ChangePassword />
    </div>
  )
}
