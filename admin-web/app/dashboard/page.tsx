'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getDashboardStats, type DashboardStats } from '@/lib/stats';

function StatTile({
  href,
  accent,
  icon,
  value,
  label,
  loading,
}: {
  href?: string;
  accent: string;
  icon: string;
  value: number;
  label: string;
  loading: boolean;
}) {
  const content = (
    <>
      <div className="stat-icon">{icon}</div>
      {loading ? (
        <div className="skeleton" style={{ width: 48, height: 28, marginBottom: 4 }} />
      ) : (
        <p className="stat-value">{value}</p>
      )}
      <p className="stat-label">{label}</p>
    </>
  );

  const className = `stat-tile accent-${accent}`;
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/');
        return;
      }
      setCheckedAuth(true);
      getDashboardStats()
        .then(setStats)
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load stats.'));
    });
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (!checkedAuth) return null;

  const loading = !stats;

  return (
    <div className="dash-page">
      <div className="dash-header">
        <div>
          <h1>Hommie Admin</h1>
          <p className="muted">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="link-button" onClick={signOut}>
          Sign out
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <p className="dash-section-title">Overview</p>
      <div className="stat-grid">
        <StatTile
          href="/review"
          accent="amber"
          icon="⏳"
          value={stats?.pendingListings ?? 0}
          label="Pending review"
          loading={loading}
        />
        <StatTile accent="green" icon="🏠" value={stats?.activeListings ?? 0} label="Active listings" loading={loading} />
        <StatTile accent="blue" icon="🎓" value={stats?.students ?? 0} label="Students" loading={loading} />
        <StatTile accent="indigo" icon="🔑" value={stats?.landlords ?? 0} label="Landlords" loading={loading} />
        <StatTile accent="teal" icon="📅" value={stats?.upcomingEvents ?? 0} label="Upcoming events" loading={loading} />
        <StatTile accent="pink" icon="💼" value={stats?.activeJobs ?? 0} label="Active jobs" loading={loading} />
      </div>

      <p className="dash-section-title">Quick actions</p>
      <div className="action-grid">
        <Link href="/review" className="action-card">
          <div className="action-icon">📋</div>
          <div>
            <p className="action-title">Review Listings</p>
            <p className="muted">Approve or reject submissions</p>
          </div>
          <span className="action-arrow">→</span>
        </Link>
        <Link href="/events/new" className="action-card">
          <div className="action-icon">📅</div>
          <div>
            <p className="action-title">Create Event</p>
            <p className="muted">Add a new campus/city event</p>
          </div>
          <span className="action-arrow">→</span>
        </Link>
        <Link href="/jobs/new" className="action-card">
          <div className="action-icon">💼</div>
          <div>
            <p className="action-title">Create Job</p>
            <p className="muted">Add a new job board listing</p>
          </div>
          <span className="action-arrow">→</span>
        </Link>
      </div>
    </div>
  );
}
