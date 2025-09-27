import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'

export default function Landing(){
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Manage your library with ease</h1>
          <p className="text-muted-foreground">Search, borrow, and manage books. Secure authentication and powerful dashboard built on our API.</p>
          <div className="flex gap-3">
            <Button asChild><Link to="/dashboard">Open Dashboard</Link></Button>
            <Button variant="secondary" asChild><Link to="/login">Sign In</Link></Button>
          </div>
        </div>
        <div className="rounded-lg border p-6">
          <ul className="grid gap-2 text-sm">
            <li>Authentication</li>
            <li>Books search and listing</li>
            <li>Reservations</li>
            <li>Categories & Authors</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
