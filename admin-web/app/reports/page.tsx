'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { hideReportedContent, isHideable, openReports, reporterName, setReportStatus, type OpenReport } from '@/lib/reports';

const REASON_LABEL: Record<string, string> = {
  spam: 'Spam',
  scam_or_fraud: 'Scam or fraud',
  inappropriate: 'Inappropriate',
  harassment: 'Harassment',
  wrong_category: 'Wrong category',
  not_available: 'Not available',
  other: 'Other',
};

const SUBJECT_LABEL: Record<string, string> = {
  accommodation_listing: 'Listing',
  marketplace_listing: 'Marketplace item',
  community_post: 'Community post',
  community_comment: 'Community comment',
  roommate_profile: 'Roommate profile',
  user: 'User',
  message: 'Message',
  event: 'Event',
};

function subjectLine(r: OpenReport): string {
  const kind = SUBJECT_LABEL[r.subject_type] ?? r.subject_type;
  if (r.subject_type === 'user') {
    return `${kind}: ${r.subjectUser ? reporterName(r.subjectUser) : r.subject_id}`;
  }
  return `${kind} (${r.subject_id.slice(0, 8)}…)`;
}

export default function ReportsPage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [reports, setReports] = useState<OpenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await openReports());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports.');
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

  const act = async (id: string, status: 'actioned' | 'dismissed') => {
    setBusyId(id);
    try {
      await setReportStatus(id, status);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update report.');
    } finally {
      setBusyId(null);
    }
  };

  const hide = async (r: OpenReport) => {
    setBusyId(r.id);
    try {
      await hideReportedContent(r);
      setReports((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to hide content.');
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
        <h1>Reports</h1>
        <button className="link-button" onClick={signOut}>
          Sign out
        </button>
      </div>

      <Link href="/dashboard" className="link-button" style={{ display: 'inline-block', marginBottom: 16 }}>
        ← Dashboard
      </Link>

      <p className="muted" style={{ marginBottom: 16 }}>
        Content and user reports, including every time someone blocks another user (blocking files a report
        automatically). Mark a report <strong>Actioned</strong> once you&apos;ve dealt with it, or{' '}
        <strong>Dismiss</strong> if no action is needed.
      </p>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="muted">No open reports.</p>
      ) : (
        reports.map((r) => (
          <div className="listing-card" key={r.id}>
            <p className="listing-title">{subjectLine(r)}</p>
            <p className="muted">
              {REASON_LABEL[r.reason] ?? r.reason} · reported by {reporterName(r.reporter)} ·{' '}
              {new Date(r.created_at).toLocaleString()}
            </p>
            {r.details ? <p style={{ marginTop: 8 }}>{r.details}</p> : null}
            <div className="actions">
              <button className="btn-secondary" disabled={busyId === r.id} onClick={() => act(r.id, 'dismissed')}>
                Dismiss
              </button>
              {isHideable(r.subject_type) ? (
                <button className="btn-secondary" disabled={busyId === r.id} onClick={() => hide(r)}>
                  Hide {SUBJECT_LABEL[r.subject_type]?.toLowerCase() ?? 'content'}
                </button>
              ) : (
                <button
                  className="btn-primary"
                  style={{ marginTop: 0 }}
                  disabled={busyId === r.id}
                  onClick={() => act(r.id, 'actioned')}
                >
                  Mark actioned
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
