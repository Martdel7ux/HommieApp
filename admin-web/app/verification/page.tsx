'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  pendingVerifications,
  reviewVerification,
  studentDisplayName,
  verificationDocUrl,
  type PendingVerification,
} from '@/lib/verification';

export default function VerificationPage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPending(await pendingVerifications());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load verifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/');
        return;
      }
      setCheckedAuth(true);
      load();
    });
  }, [router, load]);

  const viewDoc = async (path: string | null) => {
    if (!path) return;
    try {
      const url = await verificationDocUrl(path);
      window.open(url, '_blank');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open document.');
    }
  };

  const act = async (id: string, approve: boolean) => {
    setBusyId(id);
    try {
      await reviewVerification(id, approve);
      setPending((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update verification.');
    } finally {
      setBusyId(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (!checkedAuth) return null;

  return (
    <div className="page">
      <div className="topbar">
        <h1>Review Verifications</h1>
        <button className="link-button" onClick={signOut}>
          Sign out
        </button>
      </div>

      <Link href="/dashboard" className="link-button" style={{ display: 'inline-block', marginBottom: 16 }}>
        ← Dashboard
      </Link>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="muted">Nothing to review.</p>
      ) : (
        pending.map((p) => (
          <div className="listing-card" key={p.id}>
            <p className="listing-title">{studentDisplayName(p)}</p>
            <p className="muted">{p.university?.name ?? 'No university set'}</p>
            <p className="muted">
              Submitted {p.verification_submitted_at ? new Date(p.verification_submitted_at).toLocaleString() : '—'}
            </p>
            <button
              className="link-button"
              style={{ marginTop: 10 }}
              onClick={() => viewDoc(p.verification_doc_path)}
            >
              View ID document →
            </button>
            <div className="actions">
              <button
                className="btn-secondary"
                disabled={busyId === p.id}
                onClick={() => act(p.id, false)}
              >
                Reject
              </button>
              <button
                className="btn-primary"
                style={{ marginTop: 0 }}
                disabled={busyId === p.id}
                onClick={() => act(p.id, true)}
              >
                Approve
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
