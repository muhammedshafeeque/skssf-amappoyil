import { getIdTokenResult, onIdTokenChanged, signOut } from '@react-native-firebase/auth';
import type { User } from '@react-native-firebase/auth';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Member, SkampClaims } from '../shared';
import { callFn } from './data';
import { auth, db } from './firebase';

export type SessionState = 'loading' | 'signedOut' | 'linking' | 'member' | 'paused';

interface Session {
  state: SessionState;
  user: User | null;
  memberId: string | null;
  member: (Member & { id: string }) | null;
  /** Login screen sets this while it finishes the OTP → completeMemberLogin step. */
  setLinking: (v: boolean) => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session>(null as never);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [member, setMember] = useState<Session['member']>(null);
  const linking = useRef(false);
  const validated = useRef(false);

  useEffect(
    () =>
      onIdTokenChanged(auth, async (u) => {
        setUser(u);
        if (!u) {
          setMemberId(null);
          setMember(null);
          setState((s) => (s === 'paused' ? 'paused' : 'signedOut'));
          return;
        }
        try {
          // On launch, force a refresh once: a revoked login (blocked member, phone change) fails here.
          const token = await getIdTokenResult(u, !validated.current);
          validated.current = true;
          const claims = token.claims as SkampClaims;
          if (claims.role === 'member' && claims.memberId) {
            setMemberId(claims.memberId);
            return;
          }
          if (linking.current) return setState('linking');
          // Signed in by phone but not linked (e.g. claims cleared): try to link again.
          await callFn('completeMemberLogin');
          await getIdTokenResult(u, true);
        } catch (err) {
          const msg = String((err as Error).message);
          if (/paused|permission/i.test(msg)) setState('paused');
          await signOut(auth).catch(() => undefined);
        }
      }),
    [],
  );

  // Launch / live status check: an inactive or blocked member is signed out immediately.
  useEffect(() => {
    if (!memberId) return;
    return onSnapshot(
      doc(db, 'members', memberId),
      (snap) => {
        const m = snap.data() as Member | undefined;
        if (!m || m.status !== 'active') {
          setState('paused');
          signOut(auth).catch(() => undefined);
          return;
        }
        setMember({ id: snap.id, ...m });
        setState('member');
      },
      () => {
        // Permission denied → claims were revoked.
        setState('paused');
        signOut(auth).catch(() => undefined);
      },
    );
  }, [memberId]);

  const value: Session = {
    state,
    user,
    memberId,
    member,
    setLinking: (v) => {
      linking.current = v;
    },
    logout: async () => {
      const { unregisterPush } = await import('./push');
      await unregisterPush().catch(() => undefined);
      setState('signedOut');
      await signOut(auth);
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

/** Leaves the "access paused" screen to try logging in again. */
export function useResetPaused() {
  const s = useSession();
  return () => {
    if (s.state === 'paused') s.logout();
  };
}
