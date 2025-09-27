import { useEffect, useState } from 'react'
import { request } from '../lib/api'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'

export default function Categories(){
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function load(){ 
    setLoading(true)
    try{ 
      const r = await request('/categories'); 
      setItems(r.data?.categories||[])
      setError('')
    }catch(e){ 
      console.error('Categories load error:', e)
      setError(e.message) 
    }
    finally { setLoading(false) }
  }
  
  useEffect(()=>{ load() },[])

  async function create(){ 
    if (!name.trim()) {
      setError('Category name is required')
      return
    }
    
    try{ 
      await request('/categories', { 
        method:'POST', 
        body: JSON.stringify({ 
          name: name.trim(),
          description: description.trim() || `Books in the ${name.trim()} category`
        }) 
      }); 
      setName(''); 
      setDescription('');
      setError('');
      await load() 
    }catch(e){ 
      setError(e.message) 
    } 
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={load} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      
      {error && <div className="rounded-md border border-red-600 bg-red-900/30 p-3 text-sm">{error}</div>}
      
      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-medium">Create Category</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Category Name" value={name} onChange={e=>setName(e.target.value)} />
          <Input placeholder="Description (optional)" value={description} onChange={e=>setDescription(e.target.value)} />
        </div>
        <Button onClick={create} disabled={loading}>
          {loading ? 'Adding...' : 'Add Category'}
        </Button>
      </div>
      
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      )}
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(c => (
          <div key={c._id} className="rounded-lg border p-4">
            <div className="font-medium text-lg" style={{color: c.color || '#333'}}>
              {c.name}
            </div>
            {c.description && (
              <div className="text-sm text-gray-600 mt-1">{c.description}</div>
            )}
            {c.icon && (
              <div className="text-xs text-gray-500 mt-2">Icon: {c.icon}</div>
            )}
          </div>
        ))}
      </div>
      
      {!loading && items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No categories found. Add some categories to organize your books.
        </div>
      )}
    </div>
  )
}
