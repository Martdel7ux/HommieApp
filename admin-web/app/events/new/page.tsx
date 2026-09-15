'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createEvent } from '@/lib/events';
import { CYPRUS_AREAS, CYPRUS_CITIES } from '@/lib/constants';

const empty = {
  title: '',
  description: '',
  host_name: 'Hommie',
  cover_image_path: '',
  starts_at: '',
  ends_at: '',
  location_name: '',
  city: CYPRUS_CITIES[0],
  area: '',
  external_url: '',
};

export default function NewEventPage() {
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

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!userId) return;
    if (!form.title.trim() || !form.host_name.trim() || !form.location_name.trim() || !form.starts_at) {
      setError('Title, host name, location, and start date are required.');
      return;
    }
    setSaving(true);
    try {
      await createEvent({
        title: form.title.trim(),
        description: form.description.trim() || null,
        host_name: form.host_name.trim(),
        cover_image_path: form.cover_image_path.trim() || null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        location_name: form.location_name.trim(),
        city: form.city,
        area: form.area || null,
        external_url: form.external_url.trim() || null,
        created_by: userId,
      });
      setSuccess(true);
      setForm(empty);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create event.');
    } finally {
      setSaving(false);
    }
  };

  if (!checkedAuth) return null;

  return (
    <div className="page-wide">
      <div className="topbar">
        <h1>Create Event</h1>
      </div>
      <Link href="/dashboard" className="link-button" style={{ display: 'inline-block', marginBottom: 16 }}>
        ← Dashboard
      </Link>

      <div className="card">
        <form onSubmit={submit}>
          <label htmlFor="title">Title</label>
          <input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} required />

          <label htmlFor="description">Description</label>
          <textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} />

          <div className="row">
            <div>
              <label htmlFor="host_name">Host name</label>
              <input id="host_name" value={form.host_name} onChange={(e) => set('host_name', e.target.value)} required />
            </div>
            <div>
              <label htmlFor="cover_image_path">Cover image URL</label>
              <input
                id="cover_image_path"
                value={form.cover_image_path}
                onChange={(e) => set('cover_image_path', e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="row">
            <div>
              <label htmlFor="starts_at">Starts at</label>
              <input
                id="starts_at"
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => set('starts_at', e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="ends_at">Ends at (optional)</label>
              <input
                id="ends_at"
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => set('ends_at', e.target.value)}
              />
            </div>
          </div>

          <label htmlFor="location_name">Location name</label>
          <input
            id="location_name"
            value={form.location_name}
            onChange={(e) => set('location_name', e.target.value)}
            placeholder="e.g. The Old Town Courtyard"
            required
          />

          <div className="row">
            <div>
              <label htmlFor="city">City</label>
              <select id="city" value={form.city} onChange={(e) => set('city', e.target.value)}>
                {CYPRUS_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="area">Area (optional)</label>
              <select id="area" value={form.area} onChange={(e) => set('area', e.target.value)}>
                <option value="">—</option>
                {CYPRUS_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label htmlFor="external_url">External URL (optional)</label>
          <input
            id="external_url"
            value={form.external_url}
            onChange={(e) => set('external_url', e.target.value)}
            placeholder="https://…"
          />

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">Event created.</p> : null}

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}
