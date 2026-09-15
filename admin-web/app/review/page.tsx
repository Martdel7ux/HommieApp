'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { landlordDisplayName, pendingListings, reviewListing, type PendingListing } from '@/lib/listings';

export default function ReviewPage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [listings, setListings] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setListings(await pendingListings());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load listings.');
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

  const act = async (id: string, approve: boolean) => {
    setBusyId(id);
    try {
      await reviewListing(id, approve);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update listing.');
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
        <h1>Review Listings</h1>
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
      ) : listings.length === 0 ? (
        <p className="muted">Nothing to review.</p>
      ) : (
        listings.map((l) => (
          <div className="listing-card" key={l.id}>
            <p className="listing-title">{l.title}</p>
            <p className="muted">
              €{l.rent_month}/mo · {l.area}, {l.city}
            </p>
            <p className="muted">Listed by {landlordDisplayName(l.landlord)}</p>
            <div className="actions">
              <button
                className="btn-secondary"
                disabled={busyId === l.id}
                onClick={() => act(l.id, false)}
              >
                Reject
              </button>
              <button
                className="btn-primary"
                style={{ marginTop: 0 }}
                disabled={busyId === l.id}
                onClick={() => act(l.id, true)}
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
