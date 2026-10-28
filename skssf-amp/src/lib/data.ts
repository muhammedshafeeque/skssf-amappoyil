import { collection, doc, limit, onSnapshot, orderBy, query, where } from '@react-native-firebase/firestore';
import { httpsCallable } from '@react-native-firebase/functions';
import { useEffect, useMemo, useState } from 'react';
import { db, functions } from './firebase';

export type WithId<T> = T & { id: string };
export type Constraint = ReturnType<typeof where> | ReturnType<typeof orderBy> | ReturnType<typeof limit>;

interface Live<T> {
  data: T;
  loading: boolean;
  error: string | null;
  /** True when the data came from the offline cache. */
  fromCache: boolean;
}

/** Live query backed by Firestore's offline cache. `key` must change when constraints change. */
export function useCollection<T>(path: string, constraints: Constraint[] = [], key = ''): Live<WithId<T>[]> {
  const [state, setState] = useState<Live<WithId<T>[]>>({ data: [], loading: true, error: null, fromCache: false });
  const q = useMemo(() => query(collection(db, path), ...constraints), [path, key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () =>
      onSnapshot(
        q,
        { includeMetadataChanges: false },
        (snap) =>
          setState({
            data: snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) })),
            loading: false,
            error: null,
            fromCache: snap.metadata.fromCache,
          }),
        (err) => setState((s) => ({ ...s, loading: false, error: err.message })),
      ),
    [q],
  );
  return state;
}

export function useDocument<T>(path: string | null): Live<WithId<T> | null> {
  const [state, setState] = useState<Live<WithId<T> | null>>({ data: null, loading: true, error: null, fromCache: false });
  useEffect(() => {
    if (!path) return;
    return onSnapshot(
      doc(db, path),
      (snap) =>
        setState({
          data: snap.exists() ? { id: snap.id, ...(snap.data() as T) } : null,
          loading: false,
          error: null,
          fromCache: snap.metadata.fromCache,
        }),
      (err) => setState((s) => ({ ...s, loading: false, error: err.message })),
    );
  }, [path]);
  return state;
}

export async function callFn<T = unknown>(name: string, data: unknown = {}): Promise<T> {
  try {
    const res = await httpsCallable(functions, name)(data);
    return res.data as T;
  } catch (err) {
    throw new Error(errorMessage(err));
  }
}

export function errorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string };
  if (e?.code === 'auth/invalid-verification-code') return 'invalidCode';
  if (e?.code === 'auth/too-many-requests' || e?.code === 'functions/resource-exhausted') return 'tooMany';
  if (e?.code === 'auth/network-request-failed' || e?.code === 'functions/unavailable') return 'network';
  return (e?.message ?? String(err)).replace(/^\[[\w/-]+\]\s*/, '');
}
