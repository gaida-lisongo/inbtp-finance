'use client'

import { useEffect } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { AuthenticatedUser } from '@/lib/utils/supabase/session';

export default function UserProvider({ 
  initialUser, 
  children 
}: { 
  initialUser: AuthenticatedUser | null, 
  children: React.ReactNode 
}) {
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    // On hydrate le store client avec les données du serveur
    setUser(initialUser);
  }, [initialUser, setUser]);

  return <>{children}</>;
}