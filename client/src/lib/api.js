const API_BASE = '/api'

let isRefreshing = false
let refreshPromise = null

export function setToken(token){
  if (token) localStorage.setItem('access_token', token); else localStorage.removeItem('access_token');
}

export function getToken(){
  return localStorage.getItem('access_token') || ''
}

export function getRefreshToken(){
  return localStorage.getItem('refresh_token') || ''
}

export function clearTokens(){
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_name')
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })

  const data = await response.json()
  
  if (!response.ok) {
    clearTokens()
    throw new Error(data?.message || 'Token refresh failed')
  }

  setToken(data.data.token)
  localStorage.setItem('refresh_token', data.data.refreshToken)
  
  return data.data.token
}

export async function request(path, opts={}){
  const headers = { 'Content-Type': 'application/json', ...(opts.headers||{}) }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  let res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
  let data = await res.json().catch(()=>null)
  
  // Handle token expiration
  if (res.status === 401 && data?.message?.includes('token') && !isRefreshing) {
    try {
      if (isRefreshing) {
        // Wait for the ongoing refresh
        await refreshPromise
      } else {
        isRefreshing = true
        refreshPromise = refreshAccessToken()
        const newToken = await refreshPromise
        
        // Retry the original request with new token
        headers['Authorization'] = `Bearer ${newToken}`
        res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
        data = await res.json().catch(()=>null)
      }
    } catch (refreshError) {
      // Refresh failed, redirect to login
      clearTokens()
      window.location.href = '/login'
      throw new Error('Session expired. Please login again.')
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  }
  
  if (!res.ok) {
    // Handle validation errors with more detail
    if (data?.errors && Array.isArray(data.errors)) {
      const errorMessages = data.errors.map(err => err.message).join(', ')
      throw new Error(errorMessages)
    }
    throw new Error(data?.message || `Request failed (${res.status})`)
  }
  
  return data
}

// Logout function
export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' })
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    clearTokens()
  }
}
