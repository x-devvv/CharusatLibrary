const API_BASE = '/api'

let isRefreshing = false
let refreshPromise = null

// Request queue to prevent overwhelming the server
const requestQueue = []
let isProcessingQueue = false

// Rate limiting state
const rateLimitState = {
  isRateLimited: false,
  retryAfter: 0,
  lastRateLimitTime: 0
}

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

// Utility function to check if we're currently rate limited
function isCurrentlyRateLimited() {
  if (!rateLimitState.isRateLimited) return false
  
  const now = Date.now()
  const timeSinceLastRateLimit = now - rateLimitState.lastRateLimitTime
  const retryAfterMs = rateLimitState.retryAfter * 1000
  
  if (timeSinceLastRateLimit >= retryAfterMs) {
    rateLimitState.isRateLimited = false
    rateLimitState.retryAfter = 0
    return false
  }
  
  return true
}

// Utility function to set rate limiting state
function setRateLimited(retryAfterSeconds) {
  rateLimitState.isRateLimited = true
  rateLimitState.retryAfter = retryAfterSeconds
  rateLimitState.lastRateLimitTime = Date.now()
}

// Utility function to get remaining time until rate limit resets
export function getRateLimitRemainingTime() {
  if (!rateLimitState.isRateLimited) return 0
  
  const now = Date.now()
  const timeSinceLastRateLimit = now - rateLimitState.lastRateLimitTime
  const retryAfterMs = rateLimitState.retryAfter * 1000
  const remainingMs = retryAfterMs - timeSinceLastRateLimit
  
  return Math.max(0, Math.ceil(remainingMs / 1000))
}

// Utility function to sleep for a given number of milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Exponential backoff retry function
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      // If it's a rate limit error and we have retries left, wait and retry
      if (error.message?.includes('Too many requests') && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000 // Add jitter
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`)
        await sleep(delay)
        continue
      }
      throw error
    }
  }
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

// Process the request queue
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return
  
  isProcessingQueue = true
  
  // Dispatch queue start event
  window.dispatchEvent(new CustomEvent('queueStart'))
  
  while (requestQueue.length > 0) {
    // Dispatch queue update event
    window.dispatchEvent(new CustomEvent('queueUpdate', { 
      detail: { size: requestQueue.length } 
    }))
    
    // Check if we're rate limited before processing
    if (isCurrentlyRateLimited()) {
      const remainingTime = getRateLimitRemainingTime()
      console.log(`Rate limited, waiting ${remainingTime} seconds before processing queue`)
      await sleep(remainingTime * 1000)
      continue
    }
    
    const { resolve, reject, path, opts } = requestQueue.shift()
    
    try {
      const result = await makeRequest(path, opts)
      resolve(result)
    } catch (error) {
      reject(error)
    }
  }
  
  isProcessingQueue = false
  
  // Dispatch queue end event
  window.dispatchEvent(new CustomEvent('queueEnd'))
}

// Make the actual HTTP request
async function makeRequest(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers||{}) }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  let res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
  let data = await res.json().catch(()=>null)
  
  // Handle rate limiting
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After')
    const retryAfterSeconds = retryAfter ? parseInt(retryAfter) : 60
    
    setRateLimited(retryAfterSeconds)
    
    // Dispatch rate limit event for UI feedback
    window.dispatchEvent(new CustomEvent('rateLimit', { 
      detail: { 
        retryAfter: retryAfterSeconds,
        message: data?.message || 'Too many requests, please try again later'
      } 
    }))
    
    throw new Error(data?.message || `Too many requests, please try again in ${retryAfterSeconds} seconds`)
  }
  
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

export async function request(path, opts = {}) {
  // If we're currently rate limited, queue the request
  if (isCurrentlyRateLimited()) {
    return new Promise((resolve, reject) => {
      requestQueue.push({ resolve, reject, path, opts })
      processQueue()
    })
  }
  
  // For critical operations, use retry with backoff
  const isCriticalOperation = path.includes('/auth/') || path.includes('/transactions/borrow') || path.includes('/transactions/return')
  
  if (isCriticalOperation) {
    return retryWithBackoff(() => makeRequest(path, opts), 3, 1000)
  }
  
  // For regular operations, make the request directly
  return makeRequest(path, opts)
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
