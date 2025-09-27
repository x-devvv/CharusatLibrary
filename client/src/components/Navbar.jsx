import { Link, NavLink } from 'react-router-dom'
import { Button } from './ui/button'

export default function Navbar({ user, onLogout }) {
  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-semibold">Library</Link>
        <nav className="flex items-center gap-2">
          <NavLink to="/" className={({isActive})=>`px-2 py-1 rounded ${isActive?'bg-secondary':''}`}>Home</NavLink>
          <NavLink to="/books" className={({isActive})=>`px-2 py-1 rounded ${isActive?'bg-secondary':''}`}>Books</NavLink>
          <NavLink to="/dashboard" className={({isActive})=>`px-2 py-1 rounded ${isActive?'bg-secondary':''}`}>Dashboard</NavLink>
          {user? (
            <>
              <NavLink to="/reservations" className={({isActive})=>`px-2 py-1 rounded ${isActive?'bg-secondary':''}`}>Reservations</NavLink>
              {(user.role==='admin' || user.role==='librarian') && (
                <NavLink to="/admin/books" className={({isActive})=>`px-2 py-1 rounded ${isActive?'bg-secondary':''}`}>Manage</NavLink>
              )}
              <NavLink to="/profile" className={({isActive})=>`px-2 py-1 rounded ${isActive?'bg-secondary':''}`}>Profile</NavLink>
              <Button variant="secondary" onClick={onLogout}>Logout</Button>
            </>
          ) : (
            <>
              <Button asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/register">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
