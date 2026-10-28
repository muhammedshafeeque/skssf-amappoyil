import { onIdTokenChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ADMIN_ROLES, STAFF_ROLES } from '../shared';
import type { Role } from '../shared';
import { auth } from './firebase';

interface AuthState {
  loading: boolean;
  user: User | null;
  role: Role | null;
  /** Signed in, but the account has no staff role. */
  noAccess: boolean;
}

const AuthContext = createContext<AuthState>({ loading: true, user: null, role: null, noAccess: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, user: null, role: null, noAccess: false });

  useEffect(
    () =>
      onIdTokenChanged(auth, async (user) => {
        if (!user) return setState({ loading: false, user: null, role: null, noAccess: false });
        const token = await user.getIdTokenResult();
        const role = (token.claims.role as Role | undefined) ?? null;
        const isStaff = role !== null && (STAFF_ROLES as readonly string[]).includes(role);
        if (!isStaff) {
          await signOut(auth);
          return setState({ loading: false, user: null, role: null, noAccess: true });
        }
        setState({ loading: false, user, role, noAccess: false });
      }),
    [],
  );

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function useCan() {
  const { role } = useAuth();
  const isAdmin = role !== null && (ADMIN_ROLES as readonly string[]).includes(role);
  return {
    role,
    isAdmin,
    isSuperAdmin: role === 'super_admin',
    isStaff: role !== null,
  };
}
