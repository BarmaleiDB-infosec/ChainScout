import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { mockAuthService } from '@/lib/mock-auth';

interface AuthContextType {
  user: User | null;
  session: any;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const updateUser = async () => {
    const currentUser = await mockAuthService.getUser();
    setUser(currentUser);
    setSession(currentUser ? { user: currentUser } : null);
  };

  useEffect(() => {
    // Get initial user from mock storage
    const initUser = async () => {
      await updateUser();
      setLoading(false);
    };

    initUser();

    // Listen for storage changes (from other tabs or same tab)
    const handleStorageChange = () => {
      updateUser();
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom auth events
    const handleAuthChange = () => {
      updateUser();
    };

    window.addEventListener('auth-changed', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleAuthChange);
    };
  }, []);

  const signOut = async () => {
    await mockAuthService.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};