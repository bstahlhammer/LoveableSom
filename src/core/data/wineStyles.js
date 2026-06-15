// 12 curated style pathways for ExploreScreen.
// avgPalate is the approximate center of this style's wines on a 0–100 scale,
// used to compute fit/stretch badges for users with a taste profile.

const wineStyles = [
  {
    id: 'crisp-whites',
    name: 'Crisp whites',
    descriptor: 'Sauvignon Blanc, Grüner, Albariño',
    bg: '#dceffe',       // cobalt-tinted wash
    headingColor: '#0a3a5c',
    avgPalate: { body: 28, sweetness: 10, tannin: 8, acidity: 80 },
    description: 'These are wines that wake you up. Electric acidity, mineral freshness, and flavors of citrus, white grapefruit, and green herbs. They\'re made to drink with food — especially seafood, salads, and anything that benefits from a squeeze of lemon. The best examples come from Marlborough, the Loire Valley, Galicia in Spain, and Austria\'s Wachau.',
    whatToLook: ['Marlborough', 'Loire Valley', 'Galicia', 'Rueda', 'Wachau', 'bone dry', 'Sauvignon Blanc', 'Albariño', 'Grüner Veltliner'],
    bottles: [
      { name: 'Cloudy Bay Sauvignon Blanc', producer: 'Cloudy Bay', region: 'Marlborough, NZ', grape: 'Sauvignon Blanc', priceRange: '$22–28', searchQuery: 'Cloudy Bay Sauvignon Blanc' },
      { name: 'Sancerre', producer: 'Henri Bourgeois', region: 'Loire Valley, France', grape: 'Sauvignon Blanc', priceRange: '$28–38', searchQuery: 'Henri Bourgeois Sancerre' },
      { name: 'Pazo das Bruxas Albariño', producer: 'Familia Torres', region: 'Rías Baixas, Spain', grape: 'Albariño', priceRange: '$18–24', searchQuery: 'Torres Pazo Bruxas Albarino' },
      { name: 'Federspiel Grüner Veltliner', producer: 'Högl', region: 'Wachau, Austria', grape: 'Grüner Veltliner', priceRange: '$20–28', searchQuery: 'Högl Grüner Veltliner Wachau' },
    ],
    searchQuery: 'Sauvignon Blanc Loire Marlborough',
  },
  {
    id: 'rich-whites',
    name: 'Rich whites',
    descriptor: 'Oaked Chardonnay, Viognier, Roussanne',
    bg: '#fdf3d8',
    headingColor: '#5a3a00',
    avgPalate: { body: 74, sweetness: 14, tannin: 12, acidity: 50 },
    description: 'Full-bodied whites that feel like a meal — creamy texture, stone fruit, vanilla from oak, and a long, satisfying finish. The best examples are more complex than people expect. White Burgundy and California Chardonnay represent the world standard; Condrieu (Viognier) is one of the most seductive white wines on earth.',
    whatToLook: ['White Burgundy', 'Meursault', 'oaked', 'Condrieu', 'Chardonnay', 'Viognier', 'Roussanne', 'barrel-fermented'],
    bottles: [
      { name: 'Meursault', producer: 'Louis Jadot', region: 'Burgundy, France', grape: 'Chardonnay', priceRange: '$40–60', searchQuery: 'Louis Jadot Meursault' },
      { name: 'Sonoma Chardonnay', producer: 'Rombauer', region: 'Sonoma, CA', grape: 'Chardonnay', priceRange: '$30–38', searchQuery: 'Rombauer Chardonnay Sonoma' },
      { name: 'Condrieu', producer: 'E. Guigal', region: 'Northern Rhône, France', grape: 'Viognier', priceRange: '$45–65', searchQuery: 'Guigal Condrieu' },
      { name: 'Châteauneuf Blanc', producer: 'Château Rayas', region: 'Southern Rhône, France', grape: 'Roussanne', priceRange: '$60–90', searchQuery: 'Rayas Châteauneuf Blanc' },
    ],
    searchQuery: 'Chardonnay White Burgundy oaked',
  },
  {
    id: 'light-reds',
    name: 'Light reds',
    descriptor: 'Pinot Noir, Gamay, Barbera',
    bg: '#ffe8e8',
    headingColor: '#6b1212',
    avgPalate: { body: 34, sweetness: 12, tannin: 26, acidity: 68 },
    description: 'Lighter in color and body than most reds, but often more interesting. These wines lead with red fruit, high acidity, and earthy complexity rather than power. They work with almost any food and are best served slightly cool. Burgundy\'s Pinot Noir and Beaujolais\'s Gamay are the benchmarks. Oregon Pinot is America\'s best answer.',
    whatToLook: ['Pinot Noir', 'Gamay', 'Barbera', 'Beaujolais', 'Burgundy', 'Willamette Valley', 'light', 'elegant'],
    bottles: [
      { name: 'Bourgogne Pinot Noir', producer: 'Domaine de la Romanée-Conti', region: 'Burgundy, France', grape: 'Pinot Noir', priceRange: '$30–55', searchQuery: 'Bourgogne Pinot Noir DRC' },
      { name: 'Willamette Valley Pinot Noir', producer: 'Elk Cove', region: 'Oregon, USA', grape: 'Pinot Noir', priceRange: '$25–35', searchQuery: 'Elk Cove Pinot Noir Willamette' },
      { name: 'Fleurie', producer: 'Georges Duboeuf', region: 'Beaujolais, France', grape: 'Gamay', priceRange: '$15–22', searchQuery: 'Duboeuf Fleurie Beaujolais' },
      { name: 'Barbera d\'Asti Superiore', producer: 'Braida', region: 'Piedmont, Italy', grape: 'Barbera', priceRange: '$20–28', searchQuery: 'Braida Barbera Asti' },
    ],
    searchQuery: 'Pinot Noir Burgundy Beaujolais light',
  },
  {
    id: 'bold-reds',
    name: 'Bold reds',
    descriptor: 'Cabernet, Syrah, Malbec, Nebbiolo',
    bg: '#1c3020',
    headingColor: '#e8f4e8',
    avgPalate: { body: 82, sweetness: 10, tannin: 80, acidity: 55 },
    description: 'Wines that make themselves known. Deep color, firm tannins, dark fruit, and the kind of structure that needs years in a cellar or hours in a decanter. Napa Cabernet, Northern Rhône Syrah, and Barolo are the world standards. These wines are built for red meat, aged cheese, and occasions worth remembering.',
    whatToLook: ['Cabernet Sauvignon', 'Syrah', 'Shiraz', 'Barolo', 'Napa Valley', 'Hermitage', 'Ribera del Duero', 'full-bodied'],
    bottles: [
      { name: 'Stag\'s Leap Cabernet Sauvignon', producer: 'Stag\'s Leap Wine Cellars', region: 'Napa Valley, CA', grape: 'Cabernet Sauvignon', priceRange: '$50–70', searchQuery: 'Stags Leap Cabernet Sauvignon Napa' },
      { name: 'Crozes-Hermitage', producer: 'M. Chapoutier', region: 'Northern Rhône, France', grape: 'Syrah', priceRange: '$22–32', searchQuery: 'Chapoutier Crozes-Hermitage Syrah' },
      { name: 'Mendoza Malbec', producer: 'Catena Zapata', region: 'Mendoza, Argentina', grape: 'Malbec', priceRange: '$22–30', searchQuery: 'Catena Zapata Malbec Mendoza' },
      { name: 'Barolo', producer: 'Pio Cesare', region: 'Piedmont, Italy', grape: 'Nebbiolo', priceRange: '$45–65', searchQuery: 'Pio Cesare Barolo Nebbiolo' },
    ],
    searchQuery: 'Cabernet Sauvignon Barolo Syrah bold',
  },
  {
    id: 'rose',
    name: 'Rosé',
    descriptor: 'Dry Provence to fruit-forward styles',
    bg: '#fde8ec',
    headingColor: '#7a1928',
    avgPalate: { body: 30, sweetness: 18, tannin: 10, acidity: 66 },
    description: 'Rosé\'s reputation as a sweet, simple drink is completely wrong for the best examples. Dry Provence rosé — pale salmon, bone dry, briny — is one of the world\'s most food-versatile wines. These wines are made to drink with food, not as an aperitif. The color can range from barely pink to deep coral, which has no bearing on sweetness.',
    whatToLook: ['Provence', 'Tavel', 'Bandol', 'Côtes de Provence', 'dry', 'Grenache', 'Cinsault', 'pale'],
    bottles: [
      { name: 'Whispering Angel Rosé', producer: 'Château d\'Esclans', region: 'Provence, France', grape: 'Grenache / Cinsault', priceRange: '$22–28', searchQuery: 'Whispering Angel Provence Rosé' },
      { name: 'Bandol Rosé', producer: 'Domaine Tempier', region: 'Bandol, France', grape: 'Mourvèdre / Grenache', priceRange: '$30–40', searchQuery: 'Domaine Tempier Bandol Rosé' },
      { name: 'Tavel Rosé', producer: 'E. Guigal', region: 'Tavel, Rhône', grape: 'Grenache', priceRange: '$18–25', searchQuery: 'Guigal Tavel Rosé' },
      { name: 'Meiomi Rosé', producer: 'Meiomi', region: 'California, USA', grape: 'Pinot Noir', priceRange: '$14–18', searchQuery: 'Meiomi Rosé California' },
    ],
    searchQuery: 'Provence Rosé dry Bandol',
  },
  {
    id: 'bubbles',
    name: 'Bubbles',
    descriptor: 'Champagne, Crémant, Pét-Nat, Cava',
    bg: '#edf3fd',
    headingColor: '#0a1f5a',
    avgPalate: { body: 26, sweetness: 8, tannin: 6, acidity: 84 },
    description: 'Sparkling wine is not a special-occasion category — it\'s a style with more range than most people realize. Champagne is the benchmark; Crémant from France and Cava from Spain offer similar method and complexity at a fraction of the price. Pét-nat is the funky, cloudy, low-intervention alternative for the adventurous. Prosecco is simpler and fruitier, made for aperitivo.',
    whatToLook: ['Champagne', 'Crémant', 'Cava', 'pét-nat', 'Brut', 'NV', 'méthode traditionnelle', 'Blanc de Blancs'],
    bottles: [
      { name: 'Brut NV', producer: 'Billecart-Salmon', region: 'Champagne, France', grape: 'Chardonnay / Pinot Noir', priceRange: '$50–65', searchQuery: 'Billecart-Salmon Champagne Brut' },
      { name: 'Crémant d\'Alsace Brut', producer: 'Trimbach', region: 'Alsace, France', grape: 'Pinot Blanc', priceRange: '$18–24', searchQuery: 'Trimbach Crémant Alsace' },
      { name: 'Cava Brut Reserva', producer: 'Gramona', region: 'Penedès, Spain', grape: 'Xarel·lo / Macabeo', priceRange: '$20–28', searchQuery: 'Gramona Cava Brut Reserva' },
      { name: 'Pet Nat', producer: 'La Garagista', region: 'Vermont, USA', grape: 'Marquette', priceRange: '$25–35', searchQuery: 'La Garagista Pet Nat Vermont' },
    ],
    searchQuery: 'Champagne Cremant Cava sparkling brut',
  },
  {
    id: 'skin-contact',
    name: 'Skin contact',
    descriptor: 'Orange wines, amber wines',
    bg: '#fdf0d8',
    headingColor: '#5a2e00',
    avgPalate: { body: 56, sweetness: 12, tannin: 52, acidity: 64 },
    description: 'Orange wine is white wine made like red wine — the grape skins stay in contact with the juice during fermentation, adding tannin, texture, and a golden-amber color. The results can be nutty, waxy, and savory, with an almost chewy texture that\'s unlike any other white. Georgia (the country) is the spiritual home of this ancient practice; Italy\'s Friuli and Slovenia also produce excellent examples.',
    whatToLook: ['skin contact', 'orange wine', 'amber wine', 'qvevri', 'Friulano', 'Pinot Grigio Ramato', 'extended maceration'],
    bottles: [
      { name: 'Ramato Pinot Grigio', producer: 'Livio Felluga', region: 'Friuli, Italy', grape: 'Pinot Grigio', priceRange: '$22–30', searchQuery: 'Livio Felluga Ramato Pinot Grigio' },
      { name: 'Rkatsiteli', producer: 'Pheasant\'s Tears', region: 'Kakheti, Georgia', grape: 'Rkatsiteli', priceRange: '$28–38', searchQuery: 'Pheasants Tears Rkatsiteli Georgia' },
      { name: 'Sivi Pinot', producer: 'Movia', region: 'Brda, Slovenia', grape: 'Pinot Gris', priceRange: '$25–35', searchQuery: 'Movia Sivi Pinot Brda Slovenia' },
      { name: 'Radikon Oslavje', producer: 'Radikon', region: 'Friuli, Italy', grape: 'Chardonnay / Sauvignon / Pinot Grigio', priceRange: '$35–50', searchQuery: 'Radikon Oslavje Friuli orange' },
    ],
    searchQuery: 'orange wine skin contact amber Friuli',
  },
  {
    id: 'natural',
    name: 'Natural & lo-fi',
    descriptor: 'Wild yeast, minimal intervention',
    bg: '#e8f4e4',
    headingColor: '#1a3a10',
    avgPalate: { body: 48, sweetness: 12, tannin: 30, acidity: 60 },
    description: 'Natural wine is not a single style but a philosophy — grapes grown organically or biodynamically, fermented with wild yeasts, and bottled with minimal additions. The results range from luminously pure to genuinely funky. The best natural wines are some of the most interesting bottles you\'ll ever open; the worst are undrinkable. Knowing which producer you\'re buying from matters more here than anywhere else.',
    whatToLook: ['natural', 'lo-fi', 'biodynamic', 'wild yeast', 'no added sulfites', 'pét-nat', 'orange wine', 'zero-zero'],
    bottles: [
      { name: 'Beaujolais Gamay', producer: 'Marcel Lapierre', region: 'Morgon, France', grape: 'Gamay', priceRange: '$22–30', searchQuery: 'Marcel Lapierre Morgon Beaujolais' },
      { name: 'Gut Oggau Mechthild', producer: 'Gut Oggau', region: 'Burgenland, Austria', grape: 'Welschriesling', priceRange: '$28–38', searchQuery: 'Gut Oggau Mechthild Austria natural' },
      { name: 'Le Temps des Cerises', producer: 'La Sorga', region: 'Languedoc, France', grape: 'Grenache', priceRange: '$18–24', searchQuery: 'La Sorga Temps Cerises natural Languedoc' },
      { name: 'Vin de France Blanc', producer: 'Domaine Mosse', region: 'Loire, France', grape: 'Chenin Blanc', priceRange: '$22–30', searchQuery: 'Domaine Mosse Loire natural Chenin' },
    ],
    searchQuery: 'natural wine biodynamic wild yeast',
  },
  {
    id: 'dessert',
    name: 'Sweet & dessert',
    descriptor: 'Sauternes, Port, Tokaj, Moscato',
    bg: '#fdf6d8',
    headingColor: '#5a3a00',
    avgPalate: { body: 66, sweetness: 80, tannin: 38, acidity: 58 },
    description: 'The world\'s greatest dessert wines are a study in balance — the sweetness is always held in check by acidity, so they never cloy. Sauternes is honeyed and complex from botrytis mold; Port is rich and fortified; Tokaji Aszú from Hungary is ancient and extraordinary. Moscato d\'Asti is the lightest and most approachable, at barely 5% alcohol.',
    whatToLook: ['Sauternes', 'Port', 'Tokaji', 'Beerenauslese', 'TBA', 'late harvest', 'Moscato d\'Asti', 'Vin Santo', 'botrytis'],
    bottles: [
      { name: 'Château d\'Yquem', producer: 'Lur-Saluces', region: 'Sauternes, France', grape: 'Sémillon / Sauvignon Blanc', priceRange: '$120–250', searchQuery: 'Chateau Yquem Sauternes' },
      { name: 'Vintage Port', producer: 'Graham\'s', region: 'Douro, Portugal', grape: 'Touriga Nacional', priceRange: '$40–70', searchQuery: "Graham's Vintage Port Douro" },
      { name: 'Tokaji Aszú 5 Puttonyos', producer: 'Royal Tokaji', region: 'Tokaj, Hungary', grape: 'Furmint', priceRange: '$35–55', searchQuery: 'Royal Tokaji Aszu 5 Puttonyos' },
      { name: 'Moscato d\'Asti', producer: 'Vietti', region: 'Piedmont, Italy', grape: 'Moscato', priceRange: '$18–24', searchQuery: 'Vietti Moscato d Asti' },
    ],
    searchQuery: 'Sauternes Port Tokaji dessert wine sweet',
  },
  {
    id: 'fortified',
    name: 'Fortified',
    descriptor: 'Sherry, Vermouth, Madeira',
    bg: '#f5e8dc',
    headingColor: '#4a2000',
    avgPalate: { body: 58, sweetness: 38, tannin: 22, acidity: 60 },
    description: 'Fortified wines are some of the most complex and misunderstood drinks in the world. Fino Sherry is bone dry, nutty, and briny — one of the best aperitifs on earth. Oloroso Sherry is rich and oxidative. Madeira is almost indestructible, aged for decades or centuries. These are not sweet grandma wines — they\'re deeply savory, complex, and underpriced relative to quality.',
    whatToLook: ['Sherry', 'Fino', 'Manzanilla', 'Amontillado', 'Oloroso', 'Madeira', 'Vermouth', 'Marsala', 'fortified'],
    bottles: [
      { name: 'Fino En Rama', producer: 'Valdespino', region: 'Jerez, Spain', grape: 'Palomino', priceRange: '$18–26', searchQuery: 'Valdespino Fino En Rama Sherry Jerez' },
      { name: 'Madeira 10-Year Malmsey', producer: 'Blandy\'s', region: 'Madeira, Portugal', grape: 'Malmsey', priceRange: '$28–38', searchQuery: "Blandy's Madeira Malmsey 10 Year" },
      { name: 'Amontillado', producer: 'Lustau', region: 'Jerez, Spain', grape: 'Palomino', priceRange: '$18–25', searchQuery: 'Lustau Amontillado Sherry' },
      { name: 'Carpano Antica Formula', producer: 'Carpano', region: 'Piedmont, Italy', grape: 'Trebbiano blend', priceRange: '$28–36', searchQuery: 'Carpano Antica Formula Vermouth' },
    ],
    searchQuery: 'Sherry Fino Madeira fortified wine',
  },
  {
    id: 'italian',
    name: 'Italian reds',
    descriptor: 'Nebbiolo, Sangiovese, Nerello',
    bg: '#f0eaff',
    headingColor: '#2a0a5a',
    avgPalate: { body: 58, sweetness: 10, tannin: 74, acidity: 74 },
    description: 'Italian reds share a common trait: they were built to be drunk with food. High acidity and firm tannins that feel aggressive alone melt away next to a plate of pasta or a bistecca. Barolo and Barbaresco (Nebbiolo) are the kings — light in color, enormous in structure, extraordinary with age. Chianti Classico (Sangiovese) is more accessible and still brilliant with anything tomato-based.',
    whatToLook: ['Barolo', 'Barbaresco', 'Chianti Classico', 'Brunello', 'Amarone', 'Nebbiolo', 'Sangiovese', 'Nerello Mascalese', 'Riserva'],
    bottles: [
      { name: 'Barolo', producer: 'Giacomo Conterno', region: 'Piedmont, Italy', grape: 'Nebbiolo', priceRange: '$60–95', searchQuery: 'Giacomo Conterno Barolo Nebbiolo' },
      { name: 'Chianti Classico Riserva', producer: 'Fontodi', region: 'Tuscany, Italy', grape: 'Sangiovese', priceRange: '$30–42', searchQuery: 'Fontodi Chianti Classico Riserva' },
      { name: 'Etna Rosso', producer: 'Benanti', region: 'Sicily, Italy', grape: 'Nerello Mascalese', priceRange: '$28–38', searchQuery: 'Benanti Etna Rosso Nerello Mascalese' },
      { name: 'Amarone della Valpolicella', producer: 'Zenato', region: 'Veneto, Italy', grape: 'Corvina', priceRange: '$35–55', searchQuery: 'Zenato Amarone Valpolicella' },
    ],
    searchQuery: 'Barolo Chianti Sangiovese Nebbiolo Italian',
  },
  {
    id: 'old-world-adventurous',
    name: 'Off the beaten path',
    descriptor: 'Txakoli, Assyrtiko, Mencía, Grüner',
    bg: '#e4eef8',
    headingColor: '#0a2040',
    avgPalate: { body: 42, sweetness: 10, tannin: 28, acidity: 78 },
    description: 'The most exciting wines right now come from grapes and regions most people have never heard of. Assyrtiko from Santorini has volcanic minerality unlike anything in France. Txakoli from the Basque Country is almost tart enough to make your face pucker — in the best possible way. Mencía from Bierzo is Spain\'s most underrated red. These are discovery wines for when you\'re ready to go further.',
    whatToLook: ['Assyrtiko', 'Txakoli', 'Mencía', 'Xinomavro', 'Godello', 'Fiano', 'Cru Beaujolais', 'Grüner Veltliner', 'Santorini'],
    bottles: [
      { name: 'Assyrtiko', producer: 'Sigalas', region: 'Santorini, Greece', grape: 'Assyrtiko', priceRange: '$28–40', searchQuery: 'Sigalas Assyrtiko Santorini' },
      { name: 'Txakoli', producer: 'Ameztoi', region: 'Getariako Txakolina, Spain', grape: 'Hondarrabi Zuri', priceRange: '$18–24', searchQuery: 'Ameztoi Txakoli Basque Country' },
      { name: 'Mencía Bierzo', producer: 'Descendientes de J. Palacios', region: 'Bierzo, Spain', grape: 'Mencía', priceRange: '$24–35', searchQuery: 'Descendientes Palacios Mencia Bierzo' },
      { name: 'Morgon Cru Beaujolais', producer: 'Jean Foillard', region: 'Morgon, France', grape: 'Gamay', priceRange: '$25–35', searchQuery: 'Jean Foillard Morgon Beaujolais' },
    ],
    searchQuery: 'Assyrtiko Txakoli Mencia adventurous Old World',
  },
]

export default wineStyles

// How close a style's avgPalate is to the user's palate on body + acidity.
// Returns 'fit', 'stretch', or null (no profile).
export function styleMatchBadge(style, tasteProfile) {
  if (!tasteProfile?.palate) return null
  const p = tasteProfile.palate
  const s = style.avgPalate
  const dist = Math.sqrt(
    (p.body - s.body) ** 2 * 0.5 +
    (p.acidity - s.acidity) ** 2 * 0.5
  )
  return dist <= 25 ? 'fit' : 'stretch'
}
