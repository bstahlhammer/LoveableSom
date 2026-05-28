// Rotating "did you know" facts shown while scans are processing.
export const WINE_FACTS = [
  'Champagne can only be called Champagne if it’s grown in the Champagne region of France.',
  'A typical bottle of wine contains the juice of about 600-800 grapes.',
  'The world’s oldest known winery, found in Armenia, is over 6,100 years old.',
  'Red wine gets its color from the grape skins, not the juice, most grape juice is clear.',
  'The “legs” running down a wine glass are caused by alcohol evaporating, not quality.',
  'There are over 10,000 grape varieties used to make wine around the world.',
  'Old World wines (Europe) tend to taste of earth and minerals; New World wines lean fruit-forward.',
  'A wine cork can survive over 100 years if stored on its side and kept cool.',
  'Tannins, the drying feel in red wine, come from grape skins, seeds, and oak barrels.',
  'White wine can be made from red grapes if the skins are removed before fermentation.',
  'The angle of a wine glass’s rim subtly changes how a wine smells and tastes.',
  'Sparkling wine bottles are thicker because the pressure inside rivals a car tire.',
  'Sommelier comes from a French word meaning the person who managed a noble’s pack animals, and their cellar.',
  'Rosé is not a blend of red and white, it’s made by briefly resting red grape skins in juice.',
  'A grape vine can live and produce fruit for over 100 years; older vines often make richer wine.',
  'The “vintage” year on a bottle is the year the grapes were picked, not when the wine was bottled.',
  'Wine fermentation was likely discovered by accident, wild yeast turning grape juice into wine.',
  'Storing wine upright for years can dry out the cork and let air in, spoiling the bottle.',
]

export function pickFact(seed = Date.now()) {
  return WINE_FACTS[Math.floor(seed) % WINE_FACTS.length]
}
