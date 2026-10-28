import { collection, collectionGroup, doc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import type { DocumentData, Query, QueryConstraint } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import { useEffect, useMemo, useState } from 'react';
import { auth, db, functions } from './firebase';

export type WithId<T> = T & { id: string };

interface Live<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

/**
 * Live query. `key` must change whenever the constraints change.
 * Prefix the path with `group:` for a collection-group query (e.g. `group:assignments`).
 */
export function useCollection<T = DocumentData>(path: string, constraints: QueryConstraint[] = [], key = ''): Live<WithId<T>[]> {
  const [state, setState] = useState<Live<WithId<T>[]>>({ data: [], loading: true, error: null });
  const q = useMemo(
    () => query(path.startsWith('group:') ? collectionGroup(db, path.slice(6)) : collection(db, path), ...constraints) as Query<DocumentData>,
    [path, key],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () =>
      onSnapshot(
        q,
        (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) })), loading: false, error: null }),
        (err) => setState({ data: [], loading: false, error: err.message }),
      ),
    [q],
  );
  return state;
}

export function useDocument<T = DocumentData>(path: string | null): Live<WithId<T> | null> {
  const [state, setState] = useState<Live<WithId<T> | null>>({ data: null, loading: true, error: null });
  useEffect(() => {
    if (!path) return setState({ data: null, loading: false, error: null });
    return onSnapshot(
      doc(db, path),
      (snap) => setState({ data: snap.exists() ? { id: snap.id, ...(snap.data() as T) } : null, loading: false, error: null }),
      (err) => setState({ data: null, loading: false, error: err.message }),
    );
  }, [path]);
  return state;
}

/** Fields every staff write must carry (security rules check them; the audit log reads them). */
export function stamp(isNew = false) {
  const uid = auth.currentUser!.uid;
  return {
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    ...(isNew ? { createdAt: serverTimestamp(), createdBy: uid } : {}),
  };
}

/** Calls a Cloud Function and returns its result; errors become readable messages. */
export async function callFn<T = unknown>(name: string, data: unknown): Promise<T> {
  try {
    const res = await httpsCallable(functions, name)(data);
    return res.data as T;
  } catch (err) {
    throw new Error(errorMessage(err));
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    if (err.code === 'permission-denied' || err.code === 'functions/permission-denied') {
      return err.message.includes('Missing or insufficient') ? 'You do not have permission to do this.' : err.message;
    }
    return err.message.replace(/^Firebase: /, '').replace(/ \(.*\)\.?$/, '');
  }
  return err instanceof Error ? err.message : String(err);
}
