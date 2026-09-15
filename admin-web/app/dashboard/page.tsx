'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/');
        return;
      }
      setCheckedAuth(true);
    });
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (!checkedAuth) return null;

  return (
    <div className="page">
      <div className="topbar">
        <h1>Hommie Admin</h1>
        <button className="link-button" onClick={signOut}>
          Sign out
        </button>
      </div>

      <Link href="/review" className="dashboard-card">
        <p className="dashboard-card-title">Review Listings</p>
        <p className="muted">Approve or reject landlord submissions</p>
      </Link>

      <Link href="/events/new" className="dashboard-card">
        <p className="dashboard-card-title">Create Event</p>
        <p className="muted">Add a new campus/city event</p>
      </Link>

      <Link href="/jobs/new" className="dashboard-card">
        <p className="dashboard-card-title">Create Job</p>
        <p className="muted">Add a new job board listing</p>
      </Link>
    </div>
  );
}
