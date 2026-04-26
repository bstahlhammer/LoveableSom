import { useMemo, useState } from 'react'
import { theme } from '../theme/theme.js'
import { wines } from '../data/mockData.js'
import { sortWines } from '../engine/sortEngine.js'
import WineCard from '../components/WineCard.jsx'
import SortToggle from '../components/SortToggle.jsx'
import UpsellBanner from '../components/UpsellBanner.jsx'
import BottomNav from '../components/BottomNav.jsx'
import TopBar from '../components/TopBar.jsx'

const SORT_OPTIONS = [
  { value: 'crowd',  label: 'Crowd' },
  { value: 'rating', label: 'Rating' },
  { value: 'value',  label: 'Value' },
]

export default function AnonResultsScreen({ navigate, goBack, onWineSelect, tasteProfile }) {
  const [sortKey, setSortKey] = useState('crowd')

  const sortedWines = useMemo(
    () => sortWines(wines, sortKey, null),
    [sortKey]
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.surface }}>
      {/* Header */}
      <div style={{ backgroundColor: theme.colors.brandDark, flexShrink: 0 }}>
        <TopBar onBack={goBack} onHome={() => navigate('home')} light />
        <div style={{ padding: `0 ${theme.spacing.lg} ${theme.spacing.md}` }}>
          <h1 style={{ fontFamily: theme.typography.fontSerif, fontSize: theme.typography.sizes.xxl, color: theme.colors.cream, fontWeight: theme.typography.weights.normal }}>
            Wine List Results
          </h1>
          <p style={{ fontSize: theme.typography.sizes.sm, color: `${theme.colors.cream}80`, fontFamily: theme.typography.fontSans, marginTop: 4 }}>
            {wines.length} wines · Tap any to explore
          </p>
          <div style={{ marginTop: theme.spacing.md }}>
            <SortToggle options={SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Upsell banner */}
        <UpsellBanner onCta={() => navigate('quizIntro')} />

        {/* Wine cards */}
        <div style={{ padding: `0 ${theme.spacing.lg} ${theme.spacing.lg}`, display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          {sortedWines.map(wine => (
            <WineCard
              key={wine.id}
              wine={wine}
              personalized={false}
              onTap={onWineSelect}
            />
          ))}
        </div>
      </div>

      <BottomNav activeTab="scan" navigate={navigate} tasteProfile={tasteProfile} />
    </div>
  )
}
