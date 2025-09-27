import type { FC } from 'react';
import { createContext, useContext } from 'react';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';

// Mock user data for preview
const mockUser = {
  _id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'student',
  profileImage: null
};

// Create a mock AuthContext
const MockAuthContext = createContext({
  user: mockUser,
  setUser: () => {},
  loading: false,
  initialized: true,
  login: () => {},
  logout: () => console.log('Logout clicked'),
  initializeAuth: () => {}
});

// Mock AuthProvider for preview
const MockAuthProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = {
    user: mockUser,
    setUser: () => {},
    loading: false,
    initialized: true,
    login: () => {},
    logout: () => console.log('Logout clicked'),
    initializeAuth: () => {}
  };

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
};

// Mock useAuth hook
const useAuth = () => {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Create a wrapper component that overrides the useAuth hook
const MockDashboardWrapper: FC = () => {
  // Temporarily override the useAuth import
  const originalModule = require('./contexts/AuthContext');
  const originalUseAuth = originalModule.useAuth;
  
  // Override useAuth to use our mock
  originalModule.useAuth = useAuth;
  
  const result = (
    <div className="min-h-screen w-full bg-[#020617] relative">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle 500px at 50% 200px, #3e3e3e, transparent)`,
        }}
      />
      <div className="relative z-10">
        <MockAuthProvider>
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        </MockAuthProvider>
      </div>
    </div>
  );
  
  // Restore original useAuth
  originalModule.useAuth = originalUseAuth;
  
  return result;
};

const LibraryDashboardPreview: FC = () => {
  return <MockDashboardWrapper />;
};

export default LibraryDashboardPreview;