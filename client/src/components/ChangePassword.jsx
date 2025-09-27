import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { request } from '../lib/api'

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match')
      setLoading(false)
      return
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password')
      setLoading(false)
      return
    }

    try {
      await request('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      })

      setSuccess('Password changed successfully!')
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (err) {
      setError(err.message)
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-400 bg-red-900/30 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
        
        {success && (
          <div className="rounded-md border border-green-400 bg-green-900/30 p-3 text-sm text-green-200">
            {success}
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="currentPassword" className="text-gray-200">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={formData.currentPassword}
            onChange={e => handleChange('currentPassword', e.target.value)}
            required
            className="h-10"
            placeholder="Enter your current password"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-gray-200">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={formData.newPassword}
            onChange={e => handleChange('newPassword', e.target.value)}
            required
            className="h-10"
            placeholder="Enter your new password (min 6 characters)"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-gray-200">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={e => handleChange('confirmPassword', e.target.value)}
            required
            className="h-10"
            placeholder="Confirm your new password"
          />
        </div>
        
        <Button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Changing Password...
            </div>
          ) : (
            'Change Password'
          )}
        </Button>
      </form>
    </div>
  )
}
