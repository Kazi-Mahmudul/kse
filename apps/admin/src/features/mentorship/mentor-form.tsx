'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createMentorAction } from './actions';

interface CategoryOption {
  id: string;
  name: string;
}

const PRESET_AVATARS = [
  {
    label: 'Male Tech / Eng 1',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Male Academic 2',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Female Tech / Design 1',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Female Scholar 2',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
  },
  {
    label: 'Senior Researcher 3',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
];

const SUGGESTED_TAGS = [
  'career',
  'interview-prep',
  'cv-review',
  'system-design',
  'higher-studies',
  'scholarship',
  'ielts',
  'research',
  'data-science',
  'freelancing',
  'react-native',
  'backend',
  'ux-design',
  'tuition',
];

export function MentorForm({ categories }: { categories: CategoryOption[] }) {
  const [imageUrl, setImageUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [tags, setTags] = useState<string[]>([
    'career',
    'interview-prep',
    'cv-review',
  ]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addTag = (tagToAdd: string) => {
    const cleaned = tagToAdd.trim().toLowerCase();
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput);
        setTagInput('');
      }
    }
  };

  return (
    <form
      action={async (formData: FormData) => {
        setIsSubmitting(true);
        // Ensure tags are submitted as comma-separated string
        formData.set('tags', tags.join(', '));
        await createMentorAction(formData);
      }}
      className="space-y-6"
    >
      {/* ── Card 1: Identity & Current Role ────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <div className="border-b border-zinc-100 pb-3">
          <h2 className="text-base font-semibold text-zinc-900">1. Mentor Identity & Role</h2>
          <p className="text-xs text-zinc-500">
            Basic contact details and primary title shown across the student discovery feed.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Full Name / Professional Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="e.g. Engr. Tanvir Hasan or Dr. Sadia Sultana"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Current Organization & Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="organization_name"
              required
              placeholder="e.g. Senior Software Engineer · Google or Assistant Professor · KUET"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Short Tagline / Summary <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="summary"
              required
              placeholder="e.g. Commonwealth Scholar · 8+ yrs mentoring tech careers & MS/PhD admissions"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
          </div>

          {/* Avatar URL & Presets */}
          <div className="sm:col-span-2 space-y-2">
            <label className="block text-xs font-medium text-zinc-700">
              Profile Photo URL
            </label>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border border-zinc-200 bg-zinc-100 flex items-center justify-center overflow-hidden shrink-0">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-xs text-zinc-400">Photo</span>
                )}
              </div>
              <input
                type="url"
                name="image_url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... image URL (optional)"
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              />
            </div>

            {/* Quick avatar presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-zinc-400">Sample presets:</span>
              {PRESET_AVATARS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setImageUrl(p.url)}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cover Photo URL & Presets */}
          <div className="sm:col-span-2 space-y-2 pt-2 border-t border-zinc-100">
            <label className="block text-xs font-medium text-zinc-700">
              Cover Photo URL (Banner)
            </label>
            <div className="flex items-center gap-3">
              <div className="h-12 w-20 rounded-lg border border-zinc-200 bg-zinc-100 flex items-center justify-center overflow-hidden shrink-0">
                {coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImageUrl}
                    alt="Cover Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-[11px] text-zinc-400">Cover</span>
                )}
              </div>
              <input
                type="url"
                name="cover_image_url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://... cover image URL (optional)"
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              />
            </div>

            {/* Quick cover presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-zinc-400">Cover presets:</span>
              {[
                { label: 'Modern Office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80' },
                { label: 'Tech Workspace', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80' },
                { label: 'Campus & Library', url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80' },
                { label: 'Data & Charts', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80' },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setCoverImageUrl(p.url)}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 2: Academic & Credentials ─────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <div className="border-b border-zinc-100 pb-3">
          <h2 className="text-base font-semibold text-zinc-900">
            2. Academic & Experience Credentials
          </h2>
          <p className="text-xs text-zinc-500">
            Degrees, alma mater, and years of practical experience.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Education / Degrees
            </label>
            <input
              type="text"
              name="education"
              placeholder="e.g. BSc in CSE · KUET | MSc Commonwealth Scholar · University of Edinburgh"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Experience (Years)
            </label>
            <input
              type="number"
              name="experience_years"
              defaultValue={5}
              min="0"
              max="60"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Initial Rating (1.00 - 5.00)
            </label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="5.0"
              name="rating_avg"
              defaultValue={4.9}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Review Count
            </label>
            <input
              type="number"
              name="rating_count"
              defaultValue={16}
              min="0"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Session Mode
            </label>
            <select
              name="opportunity_mode"
              defaultValue="remote"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            >
              <option value="remote">Online / Remote (Google Meet / Zoom)</option>
              <option value="onsite">On-site (Khulna / Office)</option>
              <option value="hybrid">Hybrid (Both Online & On-site)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Card 3: Discovery, Category & Tags ──────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <div className="border-b border-zinc-100 pb-3">
          <h2 className="text-base font-semibold text-zinc-900">
            3. Mentorship Category & Search Tags
          </h2>
          <p className="text-xs text-zinc-500">
            Tags power the app&apos;s category browsing, search filters, and matching algorithm.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Primary Category
            </label>
            <select
              name="category_id"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            >
              <option value="">General Mentorship</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Location
            </label>
            <input
              type="text"
              name="location"
              defaultValue="Khulna / Remote"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
          </div>

          {/* Interactive Tag Chips */}
          <div className="sm:col-span-2 space-y-2">
            <label className="block text-xs font-medium text-zinc-700">
              Specialty Tags (press Enter or comma to add)
            </label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-300 p-2 min-h-12 bg-white">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 border border-indigo-100"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:text-red-600 ml-0.5 text-zinc-400 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? 'Type tag and press enter...' : 'Add more...'}
                className="flex-1 min-w-32 border-none p-1 text-xs text-zinc-900 outline-none"
              />
            </div>

            {/* Suggested quick tag chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-zinc-400">Suggested:</span>
              {SUGGESTED_TAGS.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => addTag(st)}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                    tags.includes(st)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  +{st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 4: In-depth Bio & Links ────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <div className="border-b border-zinc-100 pb-3">
          <h2 className="text-base font-semibold text-zinc-900">4. Bio & External Links</h2>
          <p className="text-xs text-zinc-500">
            Tell students what the mentor provides during 1:1 sessions and how to prepare.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              About & Mentoring Scope
            </label>
            <textarea
              name="description"
              rows={4}
              placeholder="e.g. I have 8+ years of experience guiding undergraduate students in competitive programming, full-stack architecture, and graduate admissions. In our 1:1 session, we can do resume critique, mock technical interviews, or discuss research publication pathways."
              className="w-full rounded-lg border border-zinc-300 p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                LinkedIn / Portfolio URL
              </label>
              <input
                type="url"
                name="source_url"
                placeholder="https://linkedin.com/in/username"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Source Name
              </label>
              <input
                type="text"
                name="source_name"
                defaultValue="LinkedIn"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 5: Publishing & Badges ─────────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <div className="border-b border-zinc-100 pb-3">
          <h2 className="text-base font-semibold text-zinc-900">
            5. Visibility & Verification Badges
          </h2>
          <p className="text-xs text-zinc-500">
            Control whether the mentor appears immediately in the student app.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Publish Status
            </label>
            <select
              name="status"
              defaultValue="published"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
            >
              <option value="published">Published (Live in Mobile App immediately)</option>
              <option value="draft">Draft (Private, not visible in mobile app)</option>
              <option value="pending_review">Pending Review</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="verified"
              defaultChecked={true}
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-medium text-zinc-800">
              Verified Mentor Badge (✓ displays blue checkmark in app)
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={true}
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-medium text-zinc-800">
              Featured Mentor (pinned to Top Mentors carousel in mobile app)
            </span>
          </label>
        </div>
      </div>

      {/* ── Submit Buttons ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-zinc-200 pt-5">
        <Link
          href="/mentorship"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50 transition"
        >
          {isSubmitting ? 'Creating mentor...' : 'Create & Publish Mentor'}
        </button>
      </div>
    </form>
  );
}
