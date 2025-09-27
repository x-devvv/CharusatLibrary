import { useEffect, useState } from 'react'
import { request, getToken } from '../lib/api'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

export default function Reservations(){
  const [items, setItems] = useState([])
  const [bookId, setBookId] = useState('')
  const [error, setError] = useState('')

  async function load(){ 
    if (!getToken()) {
      setError('Please log in to view reservations')
      return
    }
    try{ 
      const r = await request('/reservations'); 
      setItems(r.data?.reservations||[]) 
    }catch(e){ 
      setError(e.message) 
    } 
  }
  useEffect(()=>{ load() },[])

  async function create(){ try{ await request('/reservations', { method:'POST', body: JSON.stringify({ bookId }) }); setBookId(''); await load() }catch(e){ setError(e.message) } }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      {error && <div className="rounded-md border border-red-600 bg-red-900/30 p-3 text-sm">{error}</div>}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-medium">Create Reservation</div>
        <div className="flex gap-2">
          <Input placeholder="Book ID" value={bookId} onChange={e=>setBookId(e.target.value)} />
          <Button onClick={create}>Reserve</Button>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map(r => (
          <li key={r._id} className="rounded-lg border p-4">
            <div className="font-medium">{r.bookId?.title || r.bookId}</div>
            <div className="text-xs text-muted-foreground">Status: {r.status}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
