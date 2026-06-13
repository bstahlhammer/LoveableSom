// Static vintage quality lookup: region → year → quality (-1 difficult, 0 normal, +1 exceptional)
// Coverage limited to the 10 most common regions in the catalog.
export const VINTAGE_QUALITY = {
  'Napa Valley': {
    2012: 1, 2013: 1, 2015: 1, 2016: 1, 2019: 1,
    2011: -1, 2017: -1, 2018: 0,
  },
  'Bordeaux': {
    2009: 1, 2010: 1, 2015: 1, 2016: 1, 2018: 1,
    2013: -1, 2017: -1,
  },
  'Burgundy': {
    2010: 1, 2012: 1, 2015: 1, 2019: 1,
    2013: -1, 2016: -1,
  },
  'Tuscany': {
    2010: 1, 2012: 1, 2015: 1, 2016: 1,
    2014: -1, 2018: -1,
  },
  'Champagne': {
    2012: 1, 2013: 1, 2015: 1,
    2011: -1, 2017: -1,
  },
  'Rioja': {
    2010: 1, 2011: 1, 2016: 1,
    2013: -1,
  },
  'Barossa Valley': {
    2010: 1, 2012: 1, 2016: 1,
    2011: -1,
  },
  'Willamette Valley': {
    2012: 1, 2014: 1, 2016: 1, 2018: 1,
    2011: -1, 2017: -1,
  },
  'Sonoma Coast': {
    2012: 1, 2013: 1, 2016: 1,
    2011: -1,
  },
  'Paso Robles': {
    2013: 1, 2015: 1, 2018: 1,
    2011: -1,
  },
}
