import { useState, useEffect, useMemo } from 'react'
import T from '../theme/T.js'
import { useAuth } from '../hooks/useAuth.js'
import { supabase } from '../../integrations/supabase/client.ts'

const ADMIN_EMAIL = 'bstahlhammer@gmail.com'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function fmtWeek(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function timeAgo(iso) {
  if (!iso) return '—'
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
      color: T.ink400, fontFamily: T.fontBody, marginBottom: 12, marginTop: 32,
      paddingBottom: 8, borderBottom: `1px solid ${T.ink100}`,
    }}>
      {children}
    </div>
  )
}

function KpiCard({ label, value, sub }) {
  return (
    <div style={{
      background: T.ink0, border: `1px solid ${T.ink150}`, borderRadius: 12,
      padding: '16px 20px', minWidth: 110, flex: '1 0 auto',
    }}>
      <div style={{ fontSize: 11, color: T.ink400, fontFamily: T.fontBody, marginBottom: 6, letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, fontFamily: T.fontDisplay, color: T.ink800, lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: T.ink400, fontFamily: T.fontBody, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function WeekBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <div style={{ width: 56, fontSize: 10, color: T.ink400, fontFamily: T.fontBody, textAlign: 'right', flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 16, background: T.ink100, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <div style={{ width: 28, fontSize: 11, color: T.ink600, fontFamily: T.fontBody, textAlign: 'right', flexShrink: 0 }}>
        {value}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontSize: 13, color: T.ink400, fontFamily: T.fontBody }}>Loading…</div>
    </div>
  )
}

// ── Pricing constants (update when plans change) ──────────────────────────────
const PRICE = {
  claudePerScan:  0.003,   // Haiku 4.5: ~2.8k input tokens + ~200 output/scan
  csePerQuery:    0.005,   // Google CSE: $5/1000 queries after free tier
  cseFreePerDay:  100,     // Google CSE free tier: 100/day
  supabaseMonthly: 0,      // Free tier; $25/mo when exceeded
  cloudflareMonthly: 0,    // Free tier (100k req/day); $5/mo when exceeded
}

function fmt$(n) {
  if (n === 0) return '$0.00'
  if (n < 0.01) return '<$0.01'
  if (n < 1) return `$${n.toFixed(3)}`
  return `$${n.toFixed(2)}`
}

function CostSection({ overview, imgTotal, imgMonth, imgWeek }) {
  const [period, setPeriod] = useState('monthly')

  const scans = useMemo(() => {
    const mo = overview?.total_scans_30d || 0
    return {
      daily:   Math.round(mo / 30),
      weekly:  Math.round(mo / 4.3),
      monthly: mo,
      total:   overview?.total_scans_all || mo,
    }
  }, [overview])

  const images = useMemo(() => ({
    daily:   Math.round(imgWeek / 7),
    weekly:  imgWeek,
    monthly: imgMonth,
    total:   imgTotal,
  }), [imgTotal, imgMonth, imgWeek])

  const cseFree = { daily: 100, weekly: 700, monthly: 3000, total: null }

  const billableImages = period === 'total'
    ? images.total
    : Math.max(0, images[period] - (cseFree[period] || 0))
  const freeImagesUsed = period === 'total'
    ? null
    : Math.min(images[period], cseFree[period] || 0)

  const rows = [
    {
      service:  'Claude Haiku 4.5',
      purpose:  'Wine label scanning (vision)',
      usage:    `${scans[period].toLocaleString()} scan${scans[period] !== 1 ? 's' : ''}`,
      unitCost: '$0.003 / scan',
      cost:     scans[period] * PRICE.claudePerScan,
      note:     '~2.8k input tokens + ~200 output per scan',
    },
    {
      service:  'Google Custom Search',
      purpose:  'Wine bottle image fetching',
      usage:    `${images[period].toLocaleString()} quer${images[period] !== 1 ? 'ies' : 'y'}`,
      unitCost: '$0.005 / query',
      cost:     billableImages * PRICE.csePerQuery,
      note:     freeImagesUsed !== null
        ? freeImagesUsed > 0
          ? `${freeImagesUsed.toLocaleString()} covered by free tier (100/day)`
          : 'Within free tier (100 queries/day)'
        : 'Free tier not tracked for all-time view',
    },
    {
      service:  'Supabase',
      purpose:  'Database, auth, storage',
      usage:    'Free tier',
      unitCost: '$25 / mo if exceeded',
      cost:     period === 'monthly' || period === 'total' ? PRICE.supabaseMonthly : 0,
      note:     '500 MB DB, 5 GB bandwidth, 50k MAU',
    },
    {
      service:  'Cloudflare Workers',
      purpose:  'Hosting, API routes, cron',
      usage:    'Free tier',
      unitCost: '$5 / mo if exceeded',
      cost:     period === 'monthly' || period === 'total' ? PRICE.cloudflareMonthly : 0,
      note:     '100k requests/day included',
    },
  ]

  const total = rows.reduce((sum, r) => sum + r.cost, 0)

  const PERIODS = [
    { key: 'daily',   label: 'Daily' },
    { key: 'weekly',  label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'total',   label: 'All Time' },
  ]

  return (
    <>
      {/* Period toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} style={{
            padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontFamily: T.fontBody, fontSize: 12, fontWeight: 500,
            background: period === p.key ? T.ink800 : T.ink100,
            color:      period === p.key ? T.ink0   : T.ink500,
            transition: 'all 0.15s',
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Cost rows */}
      <div style={{ background: T.ink0, border: `1px solid ${T.ink150}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
          padding: '10px 18px', background: T.ink50, borderBottom: `1px solid ${T.ink100}`,
          fontFamily: T.fontBody, fontSize: 10, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: T.ink400,
        }}>
          <span>Service</span>
          <span>Usage</span>
          <span>Unit Cost</span>
          <span style={{ textAlign: 'right' }}>Est. Cost</span>
        </div>

        {rows.map((r, i) => (
          <div key={r.service} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
            padding: '14px 18px', alignItems: 'start',
            borderBottom: i < rows.length - 1 ? `1px solid ${T.ink100}` : 'none',
          }}>
            <div>
              <div style={{ fontFamily: T.fontBody, fontSize: 13, fontWeight: 600, color: T.ink800 }}>
                {r.service}
              </div>
              <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.ink400, marginTop: 2 }}>
                {r.purpose}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: T.fontBody, fontSize: 13, color: T.ink600 }}>{r.usage}</div>
              {r.note && (
                <div style={{ fontFamily: T.fontBody, fontSize: 10, color: T.ink300, marginTop: 2, lineHeight: 1.4 }}>
                  {r.note}
                </div>
              )}
            </div>
            <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.ink500 }}>{r.unitCost}</div>
            <div style={{ textAlign: 'right', fontFamily: T.fontDisplay, fontSize: 17, fontWeight: 600,
              color: r.cost === 0 ? T.ink300 : T.ink800 }}>
              {r.cost === 0 ? fmt$(0) : fmt$(r.cost)}
            </div>
          </div>
        ))}

        {/* Total row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
          padding: '14px 18px', background: T.ink50, borderTop: `1px solid ${T.ink150}`,
          alignItems: 'center',
        }}>
          <div style={{ fontFamily: T.fontBody, fontSize: 12, fontWeight: 700, color: T.ink600,
            letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Total
          </div>
          <div style={{ fontFamily: T.fontBody, fontSize: 10, color: T.ink300, gridColumn: '2 / 4' }}>
            Estimates only — actual billing may vary
          </div>
          <div style={{ textAlign: 'right', fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 700,
            color: total === 0 ? T.ink300 : T.forest600 }}>
            {fmt$(total)}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: T.ink300, fontFamily: T.fontBody, marginTop: 10, lineHeight: 1.6 }}>
        Claude Haiku 4.5: $0.80/MTok input, $4.00/MTok output (est. 2.8k input + 200 output/scan).
        Google CSE: 100 free queries/day; $5.00/1,000 beyond that.
        Supabase and Cloudflare on free tiers as of today.
        Daily and weekly figures are rolling averages derived from the 30-day scan count.
      </div>
    </>
  )
}

// ── Feedback dashboard ────────────────────────────────────────────────────────

const TYPE_META = {
  'Feature Request': { label: 'Feature', color: T.cobalt500, bg: T.cobalt50 },
  'Bug':             { label: 'Bug',     color: T.scarlet500, bg: T.scarlet50 },
  'UX Feedback':     { label: 'UX',      color: T.ochre600,  bg: T.ochre50  },
}

const STATUS_CYCLE = { New: 'Reviewed', Reviewed: 'Resolved', Resolved: 'New' }
const STATUS_COLOR = { New: T.forest500, Reviewed: T.cobalt500, Resolved: T.ink300 }

function TypePill({ type }) {
  const m = TYPE_META[type] ?? { label: type, color: T.ink400, bg: T.ink50 }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 9999,
      fontSize: 10, fontWeight: 700, fontFamily: T.fontBody,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      background: m.bg, color: m.color,
    }}>
      {m.label}
    </span>
  )
}

function FeedbackSection({ items, onStatusChange }) {
  const byStatus = { new: 0, reviewed: 0, resolved: 0 }
  const byType   = {}
  for (const f of items) {
    byStatus[f.status] = (byStatus[f.status] ?? 0) + 1
    byType[f.type]     = (byType[f.type]     ?? 0) + 1
  }

  return (
    <>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <KpiCard label="New"      value={byStatus.new}      sub="needs review" />
        <KpiCard label="Reviewed" value={byStatus.reviewed} sub="acknowledged" />
        <KpiCard label="Resolved" value={byStatus.resolved} sub="closed" />
        <KpiCard label="Total"    value={items.length}      />
      </div>

      {/* Type breakdown */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {Object.entries(byType).map(([type, count]) => {
          const m = TYPE_META[type] ?? { label: type, color: T.ink400, bg: T.ink50 }
          return (
            <span key={type} style={{
              padding: '4px 12px', borderRadius: 9999,
              fontSize: 11, fontFamily: T.fontBody, fontWeight: 500,
              background: m.bg, color: m.color,
            }}>
              {m.label} · {count}
            </span>
          )
        })}
      </div>

      {/* Submissions list */}
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: T.ink400, fontFamily: T.fontBody }}>No feedback yet.</div>
      ) : (
        <div style={{ background: T.ink0, border: `1px solid ${T.ink150}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '90px 1fr 140px 70px 64px 80px',
            padding: '10px 18px', background: T.ink50, borderBottom: `1px solid ${T.ink100}`,
            fontFamily: T.fontBody, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: T.ink400,
          }}>
            <span>Type</span>
            <span>Message</span>
            <span>User</span>
            <span>Screen</span>
            <span>Age</span>
            <span>Status</span>
          </div>
          {items.map((f, i) => (
            <div key={f.id} style={{
              display: 'grid', gridTemplateColumns: '90px 1fr 140px 70px 64px 80px',
              padding: '12px 18px', alignItems: 'start',
              borderBottom: i < items.length - 1 ? `1px solid ${T.ink100}` : 'none',
            }}>
              <div><TypePill type={f.type} /></div>
              <div style={{
                fontFamily: T.fontBody, fontSize: 12, color: T.ink700, lineHeight: 1.45,
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                paddingRight: 12,
              }}>
                {f.description}
              </div>
              <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.ink400, wordBreak: 'break-all', paddingRight: 8 }}>
                {f._email ?? '—'}
              </div>
              <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.ink400 }}>
                {f.screen ?? '—'}
              </div>
              <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.ink400 }}>
                {timeAgo(f.submitted_at)}
              </div>
              <div>
                <button
                  onClick={() => onStatusChange(f.id, STATUS_CYCLE[f.status] ?? 'New')}
                  style={{
                    padding: '3px 10px', borderRadius: 9999,
                    border: `1px solid ${STATUS_COLOR[f.status] ?? T.ink300}`,
                    background: 'transparent',
                    color: STATUS_COLOR[f.status] ?? T.ink400,
                    fontSize: 10, fontFamily: T.fontBody, fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {f.status}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading]       = useState(true)
  const [overview, setOverview]     = useState(null)
  const [users, setUsers]           = useState([])
  const [weekly, setWeekly]         = useState([])
  const [topWines, setTopWines]     = useState([])
  const [labelReqs, setLabelReqs]   = useState([])
  const [imgTotal, setImgTotal]     = useState(0)
  const [imgMonth, setImgMonth]     = useState(0)
  const [imgWeek, setImgWeek]       = useState(0)
  const [feedback, setFeedback]     = useState([])
  const [error, setError]           = useState(null)

  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) { setLoading(false); return }

    const now   = new Date()
    const d30   = new Date(now - 30 * 86400000).toISOString()
    const d7    = new Date(now - 7  * 86400000).toISOString()

    Promise.all([
      supabase.from('v_admin_overview').select('*').single(),
      supabase.from('v_admin_users').select('*'),
      supabase.from('v_admin_weekly').select('*'),
      supabase.from('v_admin_top_wines').select('*'),
      supabase.from('label_requests').select('wine_name, status, requested_by, created_at, matched_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('wine_catalog').select('id', { count: 'exact', head: true }).not('image_fetched_at', 'is', null),
      supabase.from('wine_catalog').select('id', { count: 'exact', head: true }).not('image_fetched_at', 'is', null).gte('image_fetched_at', d30),
      supabase.from('wine_catalog').select('id', { count: 'exact', head: true }).not('image_fetched_at', 'is', null).gte('image_fetched_at', d7),
      supabase.from('feedback').select('id, type, description, screen, status, submitted_at, user_id').order('submitted_at', { ascending: false }).limit(50),
    ]).then(([ov, us, wk, tw, lr, imgT, imgM, imgW, fb]) => {
      if (ov.error) { setError(ov.error.message); setLoading(false); return }
      setOverview(ov.data)
      setUsers(us.data || [])
      setWeekly(wk.data || [])
      setTopWines(tw.data || [])
      setLabelReqs(lr.data || [])
      setImgTotal(imgT.count || 0)
      setImgMonth(imgM.count || 0)
      setImgWeek(imgW.count  || 0)
      const emailMap = {}
      for (const u of us.data || []) emailMap[u.user_id] = u.email
      setFeedback((fb.data || []).map(f => ({ ...f, _email: emailMap[f.user_id] ?? null })))
      setLoading(false)
    })
  }, [user, authLoading, isAdmin])

  if (authLoading || (isAdmin && loading)) return <Spinner />

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: T.fontBody }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: T.ink600, marginBottom: 8 }}>Sign in required</div>
          <a href="/" style={{ fontSize: 13, color: T.cobalt500 }}>← Back to app</a>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: T.fontBody }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: T.ink600, marginBottom: 8 }}>Not authorized</div>
          <a href="/" style={{ fontSize: 13, color: T.cobalt500 }}>← Back to app</a>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: T.fontBody }}>
        <div style={{ color: T.scarlet500, fontSize: 13 }}>Error loading analytics: {error}</div>
        <div style={{ fontSize: 11, color: T.ink400, marginTop: 8 }}>
          Make sure migration 005_admin_analytics.sql has been run and the backfill query has been executed.
        </div>
      </div>
    )
  }

  async function handleFeedbackStatus(id, nextStatus) {
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: nextStatus } : f))
    await supabase.from('feedback').update({ status: nextStatus }).eq('id', id)
  }

  const maxActive  = Math.max(...weekly.map(w => w.active_users), 1)
  const maxSignups = Math.max(...weekly.map(w => w.new_users), 1)
  const displayWeekly = weekly.slice(0, 8)

  const lrPending  = labelReqs.filter(r => r.status === 'pending')
  const lrMatched  = labelReqs.filter(r => r.status === 'matched').length
  const lrNoMatch  = labelReqs.filter(r => r.status === 'no_match').length
  const lrResolved = lrMatched + lrNoMatch
  const matchRate  = lrResolved > 0 ? Math.round((lrMatched / lrResolved) * 100) : null
  const lastEnriched = labelReqs
    .filter(r => r.matched_at)
    .map(r => r.matched_at)
    .sort()
    .at(-1) ?? null

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: `linear-gradient(135deg, ${T.forest50} 0%, ${T.ink0} 40%)` }}>
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontFamily: T.fontDisplay, fontSize: 32, fontWeight: 500, color: T.ink800, margin: 0 }}>
              Uncork
            </h1>
            <span style={{ fontFamily: T.fontBody, fontSize: 11, color: T.ink400, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              Admin
            </span>
          </div>
          <a href="/" style={{ fontSize: 12, color: T.cobalt500, fontFamily: T.fontBody, textDecoration: 'none' }}>
            ← App
          </a>
        </div>
        <div style={{ fontSize: 11, color: T.ink400, fontFamily: T.fontBody, marginBottom: 32 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>

        {/* KPI cards */}
        <SectionHeading>Overview</SectionHeading>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          <KpiCard label="Total Users"    value={overview?.total_users} />
          <KpiCard label="MAU (30d)"      value={overview?.mau} />
          <KpiCard label="WAU (7d)"       value={overview?.wau} />
          <KpiCard label="New This Week"  value={overview?.new_users_7d} />
          <KpiCard label="Scans (30d)"    value={overview?.total_scans_30d} />
          <KpiCard label="Avg Scans/User" value={overview?.avg_scans_per_user} />
          <KpiCard label="Label Requests" value={overview?.label_requests_total} />
        </div>

        {/* Users table */}
        <SectionHeading>Users · {users.length} total</SectionHeading>
        <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${T.ink150}`, background: T.ink0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: T.fontBody, fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.ink100}`, background: T.ink50 }}>
                {['Email', 'Joined', 'Last Active', 'Sign-ins', 'Scans', 'Wines', 'Label Req', 'Days Inactive'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.ink400, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.user_id} style={{ borderBottom: i < users.length - 1 ? `1px solid ${T.ink100}` : 'none' }}>
                  <td style={{ padding: '10px 14px', color: T.ink700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: '10px 14px', color: T.ink500, whiteSpace: 'nowrap' }}>{fmtDate(u.joined_at)}</td>
                  <td style={{ padding: '10px 14px', color: u.last_scan_at ? T.ink600 : T.ink300, whiteSpace: 'nowrap' }}>
                    {u.last_scan_at ? timeAgo(u.last_scan_at) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: T.ink500, whiteSpace: 'nowrap' }}>{fmtDate(u.last_sign_in_at)}</td>
                  <td style={{ padding: '10px 14px', color: T.ink700, fontWeight: u.scan_count > 0 ? 600 : 400 }}>{u.scan_count}</td>
                  <td style={{ padding: '10px 14px', color: T.ink500 }}>{u.wines_scanned}</td>
                  <td style={{ padding: '10px 14px', color: T.ink500 }}>{u.label_requests}</td>
                  <td style={{ padding: '10px 14px', color: u.days_since_active > 14 ? T.scarlet400 : T.ink400 }}>
                    {u.days_since_active != null ? `${u.days_since_active}d` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Weekly activity */}
        <SectionHeading>Weekly Activity · last 8 weeks</SectionHeading>
        <div style={{ background: T.ink0, border: `1px solid ${T.ink150}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.ink500, fontFamily: T.fontBody }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: T.forest400 }} /> Active users
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.ink500, fontFamily: T.fontBody }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: T.cobalt300 }} /> New signups
            </div>
          </div>
          {displayWeekly.map((w, i) => (
            <div key={i} style={{ marginBottom: i < displayWeekly.length - 1 ? 14 : 0 }}>
              <div style={{ fontSize: 10, color: T.ink400, fontFamily: T.fontBody, marginBottom: 4, letterSpacing: '0.04em' }}>
                {fmtWeek(w.week_start)}
              </div>
              <WeekBar label="Active"  value={w.active_users} max={maxActive}  color={T.forest400} />
              <WeekBar label="New"     value={w.new_users}    max={maxSignups} color={T.cobalt300} />
            </div>
          ))}
          {displayWeekly.length === 0 && (
            <div style={{ fontSize: 12, color: T.ink400, fontFamily: T.fontBody }}>No scan data yet.</div>
          )}
        </div>

        {/* Top wines */}
        <SectionHeading>Top Wines · last 30 days</SectionHeading>
        {topWines.length === 0 ? (
          <div style={{ fontSize: 12, color: T.ink400, fontFamily: T.fontBody }}>No scan data yet.</div>
        ) : (
          <div style={{ background: T.ink0, border: `1px solid ${T.ink150}`, borderRadius: 12, overflow: 'hidden' }}>
            {topWines.map((w, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 18px',
                borderBottom: i < topWines.length - 1 ? `1px solid ${T.ink100}` : 'none',
                fontFamily: T.fontBody,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 10, color: T.ink300, width: 18, textAlign: 'right' }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: T.ink700 }}>{w.wine_name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.forest500 }}>
                  {w.scan_count} {w.scan_count === 1 ? 'scan' : 'scans'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Label requests */}
        <SectionHeading>Label Enrichment</SectionHeading>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <KpiCard label="Pending"    value={lrPending.length} sub="awaiting enrichment" />
          <KpiCard label="Matched"    value={lrMatched}        sub="labels found" />
          <KpiCard label="No match"   value={lrNoMatch}        sub="not in dataset" />
          <KpiCard label="Match rate" value={matchRate != null ? `${matchRate}%` : '—'} sub="of resolved requests" />
        </div>

        {lastEnriched && (
          <div style={{ fontSize: 11, color: T.ink400, fontFamily: T.fontBody, marginBottom: 16 }}>
            Last enrichment run: {fmtDate(lastEnriched)} · {timeAgo(lastEnriched)}
          </div>
        )}
        {!lastEnriched && lrPending.length > 0 && (
          <div style={{ fontSize: 11, color: T.ochre500, fontFamily: T.fontBody, marginBottom: 16 }}>
            Enrichment has not run yet — {lrPending.length} request{lrPending.length !== 1 ? 's' : ''} waiting.
          </div>
        )}

        {lrPending.length > 0 && (
          <div style={{ background: T.ink0, border: `1px solid ${T.ink150}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 18px', background: T.ink50, borderBottom: `1px solid ${T.ink100}`, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.ink400, fontFamily: T.fontBody }}>
              Pending queue · {lrPending.length}
            </div>
            {lrPending.slice(0, 30).map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 18px',
                borderBottom: i < Math.min(lrPending.length, 30) - 1 ? `1px solid ${T.ink100}` : 'none',
                fontFamily: T.fontBody,
              }}>
                <span style={{ fontSize: 13, color: T.ink700 }}>{r.wine_name}</span>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: T.ink400 }}>
                    {r.requested_by ? 'user' : 'auto'}
                  </span>
                  <span style={{ fontSize: 11, color: T.ink400 }}>{timeAgo(r.created_at)}</span>
                </div>
              </div>
            ))}
            {lrPending.length > 30 && (
              <div style={{ padding: '10px 18px', fontSize: 11, color: T.ink400, fontFamily: T.fontBody, borderTop: `1px solid ${T.ink100}` }}>
                + {lrPending.length - 30} more
              </div>
            )}
          </div>
        )}

        {lrPending.length === 0 && labelReqs.length === 0 && (
          <div style={{ fontSize: 12, color: T.ink400, fontFamily: T.fontBody }}>No label requests yet.</div>
        )}
        {lrPending.length === 0 && labelReqs.length > 0 && (
          <div style={{ fontSize: 12, color: T.forest500, fontFamily: T.fontBody }}>Queue is clear — all requests resolved.</div>
        )}

        {/* Cost estimator */}
        <SectionHeading>Cost Estimator</SectionHeading>
        <CostSection
          overview={overview}
          imgTotal={imgTotal}
          imgMonth={imgMonth}
          imgWeek={imgWeek}
        />

        {/* Feedback */}
        <SectionHeading>User Feedback · last 50</SectionHeading>
        <FeedbackSection items={feedback} onStatusChange={handleFeedbackStatus} />

      </div>
    </div>
  )
}
