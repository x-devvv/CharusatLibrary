import { useEffect, useState } from 'react'
import { request } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'

export default function Dashboard(){
  const [status, setStatus] = useState(null)
  const [books, setBooks] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(()=>{ (async()=>{
    try{ const s = await request('/status'); setStatus(s) }catch(e){ setError(e.message) }
    try{ const b = await request('/books'); setBooks(b.data?.books || []) }catch(e){ setError(e.message) }
  })() },[])

  async function search(){
    try{ const r = await request(`/books/search?q=${encodeURIComponent(query)}`); setBooks(r.data?.books||[]) }catch(e){ setError(e.message) }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {error && <div className="rounded-md border border-red-600 bg-red-900/30 p-3 text-sm">{error}</div>}

      <Card>
        <CardHeader><CardTitle>API Status</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>Environment: <strong>{status?.environment || '-'}</strong></div>
          <div>Version: <strong>{status?.version || '-'}</strong></div>
          <div>Auth: <strong>{status?.features?.authentication? 'On':'Off'}</strong></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Books</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <Input placeholder="Search books..." value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} />
            <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" onClick={search}>Search</button>
          </div>
          {books.length===0? (
            <div className="text-sm text-muted-foreground">No books found.</div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((b)=> (
                <li key={b._id} className="rounded-lg border p-4">
                  <div className="font-medium">{b.title||'Untitled'}</div>
                  <div className="text-xs text-muted-foreground">ISBN: {b.isbn||'N/A'}</div>
                  <div className="text-xs text-muted-foreground">Available: {b.availableCopies ?? 0}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
