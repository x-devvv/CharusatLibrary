import { useEffect, useState } from 'react'
import { request, getToken } from '../lib/api'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

export default function Authors(){
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [biography, setBiography] = useState('')
  const [nationality, setNationality] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function load(){ 
    setLoading(true)
    try{ 
      const r = await request('/authors/with-counts'); 
      setItems(r.data?.authors||[])
      setError('')
    }catch(e){ 
      console.error('Authors load error:', e)
      setError(e.message) 
    }
    finally { setLoading(false) }
  }
  
  useEffect(()=>{ load() },[])

  async function create(){ 
    if (!name.trim()) {
      setError('Author name is required')
      return
    }
    
    try{ 
      await request('/authors', { 
        method:'POST', 
        body: JSON.stringify({ 
          name: name.trim(), 
          biography: biography.trim() || `Biography of ${name.trim()}`,
          nationality: nationality.trim() || 'Unknown'
        }) 
      }); 
      setName(''); 
      setBiography('');
      setNationality('');
      setError('');
      await load() 
    }catch(e){ 
      setError(e.message) 
    } 
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      {error && <div className="rounded-md border border-red-600 bg-red-900/30 p-3 text-sm">{error}</div>}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-medium">Create Author</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input placeholder="Author Name" value={name} onChange={e=>setName(e.target.value)} />
          <Input placeholder="Biography (optional)" value={biography} onChange={e=>setBiography(e.target.value)} />
          <Input placeholder="Nationality (optional)" value={nationality} onChange={e=>setNationality(e.target.value)} />
        </div>
        <Button onClick={create} disabled={loading}>
          {loading ? 'Adding...' : 'Add Author'}
        </Button>
      </div>
      
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      )}
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(a => (
          <div key={a._id} className="rounded-lg border p-4">
            <div className="font-medium text-lg">{a.name}</div>
            {a.nationality && <div className="text-sm text-gray-600">Nationality: {a.nationality}</div>}
            {a.biography && <div className="text-sm text-gray-600 mt-1">{a.biography}</div>}
            {a.booksCount !== undefined && (
              <div className="text-sm text-blue-600 mt-2">Books: {a.booksCount}</div>
            )}
          </div>
        ))}
      </div>
      
      {!loading && items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No authors found. Add some authors to get started.
        </div>
      )}
    </div>
  )
}
