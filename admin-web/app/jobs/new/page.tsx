'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createJob } from '@/lib/jobs';
import { JOB_PAY_PERIODS, JOB_TYPES, JOB_WORK_MODES } from '@/lib/constants';

const empty = {
  title: '',
  company: '',
  company_logo_url: '',
  location: '',
  work_mode: JOB_WORK_MODES[0].value,
  job_type: JOB_TYPES[0].value,
  pay_min: '',
  pay_max: '',
  pay_period: '',
  pay_note: '',
  student_friendly: true,
  verified: true,
  summary: '',
  description: '',
  responsibilities: '',
  requirements: '',
  apply_url: '',
  apply_email: '',
  contact_phone: '',
  expires_on: '',
};

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function NewJobPage() {
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/');
        return;
      }
      setUserId(data.session.user.id);
      setCheckedAuth(true);
    });
  }, [router]);

  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!userId) return;

    if (!form.title.trim() || !form.company.trim() || !form.location.trim()) {
      setError('Title, company, and location are required.');
      return;
    }
    if (!form.apply_url.trim() && !form.apply_email.trim()) {
      setError('Provide at least an Apply URL or an Apply email.');
      return;
    }
    const payMin = form.pay_min ? Number(form.pay_min) : null;
    const payMax = form.pay_max ? Number(form.pay_max) : null;
    if (payMin != null && payMax != null && payMax < payMin) {
      setError('Pay max cannot be less than pay min.');
      return;
    }

    setSaving(true);
    try {
      await createJob({
        title: form.title.trim(),
        company: form.company.trim(),
        company_logo_url: form.company_logo_url.trim() || null,
        location: form.location.trim(),
        work_mode: form.work_mode,
        job_type: form.job_type,
        pay_min: payMin,
        pay_max: payMax,
        pay_period: form.pay_period || null,
        pay_note: form.pay_note.trim() || null,
        student_friendly: form.student_friendly,
        verified: form.verified,
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        responsibilities: linesToArray(form.responsibilities),
        requirements: linesToArray(form.requirements),
        apply_url: form.apply_url.trim() || null,
        apply_email: form.apply_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        expires_on: form.expires_on || null,
        posted_by: userId,
      });
      setSuccess(true);
      setForm(empty);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create job.');
    } finally {
      setSaving(false);
    }
  };

  if (!checkedAuth) return null;

  return (
    <div className="page-wide">
      <div className="topbar">
        <h1>Create Job</h1>
      </div>
      <Link href="/dashboard" className="link-button" style={{ display: 'inline-block', marginBottom: 16 }}>
        ← Dashboard
      </Link>

      <div className="card">
        <form onSubmit={submit}>
          <div className="row">
            <div>
              <label htmlFor="title">Title</label>
              <input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} required />
            </div>
            <div>
              <label htmlFor="company">Company</label>
              <input id="company" value={form.company} onChange={(e) => set('company', e.target.value)} required />
            </div>
          </div>

          <label htmlFor="company_logo_url">Company logo URL (optional)</label>
          <input
            id="company_logo_url"
            value={form.company_logo_url}
            onChange={(e) => set('company_logo_url', e.target.value)}
            placeholder="https://…"
          />

          <div className="row">
            <div>
              <label htmlFor="location">Location</label>
              <input
                id="location"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="Nicosia, Remote, …"
                required
              />
            </div>
            <div>
              <label htmlFor="work_mode">Work mode</label>
              <select id="work_mode" value={form.work_mode} onChange={(e) => set('work_mode', e.target.value)}>
                {JOB_WORK_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label htmlFor="job_type">Job type</label>
          <select id="job_type" value={form.job_type} onChange={(e) => set('job_type', e.target.value)}>
            {JOB_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <div className="row">
            <div>
              <label htmlFor="pay_min">Pay min (optional)</label>
              <input
                id="pay_min"
                type="number"
                min={0}
                value={form.pay_min}
                onChange={(e) => set('pay_min', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="pay_max">Pay max (optional)</label>
              <input
                id="pay_max"
                type="number"
                min={0}
                value={form.pay_max}
                onChange={(e) => set('pay_max', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="pay_period">Pay period</label>
              <select id="pay_period" value={form.pay_period} onChange={(e) => set('pay_period', e.target.value)}>
                <option value="">—</option>
                {JOB_PAY_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label htmlFor="pay_note">Pay note (optional)</label>
          <input
            id="pay_note"
            value={form.pay_note}
            onChange={(e) => set('pay_note', e.target.value)}
            placeholder="e.g. plus commission, DOE"
          />

          <div className="checkbox-row">
            <input
              id="student_friendly"
              type="checkbox"
              checked={form.student_friendly}
              onChange={(e) => set('student_friendly', e.target.checked)}
            />
            <label htmlFor="student_friendly">Student friendly</label>
          </div>
          <div className="checkbox-row">
            <input
              id="verified"
              type="checkbox"
              checked={form.verified}
              onChange={(e) => set('verified', e.target.checked)}
            />
            <label htmlFor="verified">Verified</label>
          </div>

          <label htmlFor="summary">Summary (short, shown on cards)</label>
          <textarea id="summary" value={form.summary} onChange={(e) => set('summary', e.target.value)} />

          <label htmlFor="description">Full description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            style={{ minHeight: 140 }}
          />

          <label htmlFor="responsibilities">Responsibilities (one per line)</label>
          <textarea
            id="responsibilities"
            value={form.responsibilities}
            onChange={(e) => set('responsibilities', e.target.value)}
          />

          <label htmlFor="requirements">Requirements (one per line)</label>
          <textarea
            id="requirements"
            value={form.requirements}
            onChange={(e) => set('requirements', e.target.value)}
          />

          <div className="row">
            <div>
              <label htmlFor="apply_url">Apply URL</label>
              <input
                id="apply_url"
                value={form.apply_url}
                onChange={(e) => set('apply_url', e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div>
              <label htmlFor="apply_email">Apply email</label>
              <input
                id="apply_email"
                type="email"
                value={form.apply_email}
                onChange={(e) => set('apply_email', e.target.value)}
              />
            </div>
          </div>
          <p className="muted">At least one of Apply URL / Apply email is required.</p>

          <div className="row">
            <div>
              <label htmlFor="contact_phone">Contact phone (optional)</label>
              <input
                id="contact_phone"
                value={form.contact_phone}
                onChange={(e) => set('contact_phone', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="expires_on">Expires on (optional)</label>
              <input
                id="expires_on"
                type="date"
                value={form.expires_on}
                onChange={(e) => set('expires_on', e.target.value)}
              />
            </div>
          </div>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">Job created.</p> : null}

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create Job'}
          </button>
        </form>
      </div>
    </div>
  );
}
