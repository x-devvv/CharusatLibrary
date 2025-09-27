import { useEffect, useState } from 'react'
import { request } from '../lib/api'

export function useAuth(){
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(()=>{
    (async()=>{
      const token = localStorage.getItem('access_token')
      if (!token) { setLoading(false); return }
      try{ const r = await request('/auth/profile'); setUser(r.data?.user||null) } catch(_){ /* ignore */ }
      finally{ setLoading(false) }
    })()
  },[])
  return { user, setUser, loading }
}
