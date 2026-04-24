'use client'

import { useEffect } from 'react';
import { useUserStore } from '@/store/useUserStore';

export default function UserProvider({ 
  initialUser, 
  children 
}: { 
  initialUser: any | null, 
  children: React.ReactNode 
}) {
  const { profile, setProfile, setAccountType, setCodes, setPermissions, isLoading } = useUserStore();

  useEffect(() => {
    // On hydrate le store client avec les données du serveur
    if(initialUser?.id){
      setProfile(initialUser);
      setAccountType(initialUser?.role);
      setPermissions(initialUser?.role)

    }
  }, [initialUser]);

  useEffect(() => {
    console.log('store user', profile);
    if(profile?.id) setCodes()
  }, [profile]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}