import { theme } from '../theme/theme.js'

const ICONS = {
  // Beef / red meat
  'grilled ribeye': '🥩', 'ribeye': '🥩', 'steak': '🥩', 'lamb': '🥩',
  'lamb chops': '🥩', 'lamb rack': '🥩', 'lamb tagine': '🥩',
  'filet mignon': '🥩', 'braised short rib': '🥩', 'short rib': '🥩',
  'beef': '🥩', 'red meat': '🥩', 'burgers': '🍔', 'burger': '🍔',
  // Pork
  'bbq': '🍖', 'bbq ribs': '🍖', 'ribs': '🍖', 'porchetta': '🍖',
  'braised pork': '🍖', 'pork': '🍖', 'charcuterie': '🥓', 'prosciutto': '🥓',
  // Poultry
  'chicken': '🍗', 'grilled chicken': '🍗', 'duck': '🦆', 'grilled duck': '🦆',
  'turkey': '🍗', 'poultry': '🍗',
  // Seafood
  'fish': '🐟', 'grilled salmon': '🐟', 'salmon': '🐟', 'fresh sushi': '🍣',
  'sushi': '🍣', 'tuna': '🐟', 'seafood': '🦐', 'shrimp': '🦐',
  'oysters': '🦪', 'lobster': '🦞',
  // Pasta / grains
  'pasta': '🍝', 'pasta bolognese': '🍝', 'butter pasta': '🍝',
  'mushroom pasta': '🍝', 'mushroom risotto': '🍄', 'risotto': '🍄',
  'creamy mushroom risotto': '🍄', 'pizza': '🍕', 'wood-fired pizza': '🍕',
  // Cheese
  'cheese': '🧀', 'aged cheese': '🧀', 'aged gouda': '🧀',
  'aged pecorino': '🧀', 'mild cheddar': '🧀', 'goat cheese': '🧀',
  // Vegetables / salad
  'salad': '🥗', 'caesar salad': '🥗', 'niçoise salad': '🥗',
  'summer vegetables': '🥗', 'vegetables': '🥗', 'vegetarian': '🥗',
  // Appetizers / snacks
  'light canapés': '🥂', 'canapés': '🥂', 'appetizers': '🥂',
  'olive tapenade': '🫒', 'olives': '🫒',
  // Fruit / dessert
  'fresh fruit': '🍓', 'fruit': '🍓', 'dark chocolate': '🍫',
  'chocolate': '🍫',
  // Other
  'mild soft cheese': '🧀', 'soft cheese': '🧀',
}

function getIcon(pairing) {
  const key = pairing.toLowerCase()
  if (ICONS[key]) return ICONS[key]
  // partial match
  for (const [k, v] of Object.entries(ICONS)) {
    if (key.includes(k) || k.includes(key)) return v
  }
  return '🍽️'
}

export default function FoodPairingChip({ pairing }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: '8px 10px',
      backgroundColor: theme.colors.barTrack,
      borderRadius: theme.radius.md,
      minWidth: 64,
    }}>
      <span style={{ fontSize: 22 }}>{getIcon(pairing)}</span>
      <span style={{
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textMuted,
        fontFamily: theme.typography.fontSans,
        textAlign: 'center',
        lineHeight: 1.2,
      }}>
        {pairing}
      </span>
    </div>
  )
}
