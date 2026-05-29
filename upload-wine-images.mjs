/**
 * upload-wine-images.mjs
 *
 * Downloads wine bottle images from Vivino's public CDN (the URLs already in
 * wineImages.js) and uploads them to the uncork-labels R2 bucket so the app
 * serves them from our own storage.
 *
 * Run from the project root:
 *   node upload-wine-images.mjs
 */

import { writeFileSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'

const R2_BUCKET = 'uncork-labels'
const OUT_DIR   = 'wine-images'

const WINE_IMAGES = {
  1:  'https://images.vivino.com/thumbs/ApnIiXjcT5Kc33OHgNb9dA_375x500.jpg',
  2:  'https://images.vivino.com/thumbs/nC9V6L2mQQSq0s-wZLcaxw_pb_x300.png',
  3:  'https://images.vivino.com/thumbs/L33jsYUuTMWTMy3KoqQyXg_pb_x300.png',
  4:  'https://images.vivino.com/thumbs/GpcSXs2ERS6niDxoAsvESA_pb_x300.png',
  5:  'https://images.vivino.com/thumbs/PBhGMcRNQ7aVnVNr7VgnWA_pb_x300.png',
  6:  'https://images.vivino.com/thumbs/ZzMKzqFqRO-6oI3ys3gGgQ_pb_x300.png',
  7:  'https://images.vivino.com/thumbs/easjTPIcS-mCQ99XoYOMgQ_pb_x300.png',
  8:  'https://images.vivino.com/thumbs/U19RXtSdRMmoAesl2CBygA_pb_x300.png',
  9:  'https://images.vivino.com/thumbs/f_G1SS0eT_C6hZGGwdEZqA_pb_x300.png',
  10: 'https://images.vivino.com/thumbs/pU7uFKR-TAKAOQaf3Hpn2A_pb_x300.png',
  11: 'https://images.vivino.com/thumbs/HYVZMFigQ5qXxni7s9SpWw_pb_x300.png',
  12: 'https://images.vivino.com/thumbs/V5JCHLK_SxSiWxhghoQ1yQ_375x500.jpg',
  13: 'https://images.vivino.com/thumbs/1XYwrN2-SQqqJlCMSUp3tA_pb_x300.png',
  14: 'https://images.vivino.com/thumbs/Yt464jw0QS-ugF7ZQEbE2Q_pb_x300.png',
  15: 'https://images.vivino.com/thumbs/rORmihtxSrKG7SfuI0bD6w_pb_x300.png',
  16: 'https://images.vivino.com/thumbs/l5W5NRvZR_SzClIDSnG5Ag_pb_x300.png',
  17: 'https://images.vivino.com/thumbs/ZGxHdQyGQt-hfJt7eNMXlA_pb_x300.png',
  18: 'https://images.vivino.com/thumbs/pQ_92smWRKG7Y7h5_ZwD-w_pb_x300.png',
  19: 'https://images.vivino.com/thumbs/6dP83oDrQy2Zv6es9tHp7w_pb_x300.png',
  20: 'https://images.vivino.com/thumbs/EDQ4q_3FQ568NVspQBECug_pb_x300.png',
  21: 'https://images.vivino.com/thumbs/1QoFUeYqQaCU07v4MBx8yw_pb_x300.png',
  22: 'https://images.vivino.com/thumbs/pWOdFPoyQ427uoHW_l941g_pb_x300.png',
  23: 'https://images.vivino.com/thumbs/5kJTu3dMQUCEtBy3zIhrKA_pb_x300.png',
  24: 'https://images.vivino.com/thumbs/2Uw98KdRSdGsqxCvpXxyOQ_375x500.jpg',
  25: 'https://images.vivino.com/thumbs/Q8MlhaRDTbaYh6Ydnr__iQ_pb_x300.png',
  26: 'https://images.vivino.com/thumbs/K3N0EZYBQeWunDuzNC0Dug_pb_x300.png',
  27: 'https://images.vivino.com/thumbs/npJNfRLlTtqqmoSCrsn2Kw_pb_x300.png',
  28: 'https://images.vivino.com/thumbs/ElcyI1YpRSes_LvNodMeSQ_pb_x300.png',
  29: 'https://images.vivino.com/thumbs/0667TG7qS2KsRLsShMTjAw_pb_x300.png',
  30: 'https://images.vivino.com/thumbs/_tbErBvfQ3CcDGgJf-I6Dw_pb_x300.png',
  31: 'https://images.vivino.com/thumbs/43se9NpdSPKkbPdGMbRV6Q_pb_x300.png',
  32: 'https://images.vivino.com/thumbs/Clc1N_neRBq_orOAKw9aqg_pb_x300.png',
  33: 'https://images.vivino.com/thumbs/e8iQmynXSRq_uYHKMdPMlQ_pb_x300.png',
  34: 'https://images.vivino.com/thumbs/EvtJOugzTx-HZXZfdZvTsA_pb_x300.png',
  35: 'https://images.vivino.com/thumbs/tBJyYsUeTxuYIPy6oS5T4A_pb_x300.png',
  36: 'https://images.vivino.com/thumbs/sOfai0jLTaKoP_6oXtvH9w_pb_x300.png',
  37: 'https://images.vivino.com/thumbs/rYocDDvwSaecbbp1vfh0Wg_375x500.jpg',
  38: 'https://images.vivino.com/thumbs/CdTojlE9Tn-Ty3QR0k-DSg_pb_x300.png',
  39: 'https://images.vivino.com/thumbs/QIs0hHhdRHubnyUjY8U2kA_pb_x300.png',
  40: 'https://images.vivino.com/thumbs/Aa0lkuToQK-rGvcPUpcH3A_pb_x300.png',
  41: 'https://images.vivino.com/thumbs/ahtEVX8nQrOVeBmkYJG12w_pb_x300.png',
  42: 'https://images.vivino.com/thumbs/00ghwn0dmfp7w_375x500.jpg',
  43: 'https://images.vivino.com/thumbs/bDEH99ARSpCwFbDf3bct3w_375x500.jpg',
  44: 'https://images.vivino.com/thumbs/_jt3dPPrSZKfVmV6J8YlLg_pb_x300.png',
  45: 'https://images.vivino.com/thumbs/T8_v4hizTR-YX2nggkI52w_pb_x300.png',
  46: 'https://images.vivino.com/thumbs/YGMg3nBYROud3n23UfUy1A_pb_x300.png',
  47: 'https://images.vivino.com/thumbs/aI1jZoigSSKcf7nAxPd57Q_375x500.jpg',
  48: 'https://images.vivino.com/thumbs/xfK7hQR7T6WJjvIIsDW21A_pb_x300.png',
  49: 'https://images.vivino.com/thumbs/mpBp_HteQAKsBo5MJ6JnMA_pb_x300.png',
  50: 'https://images.vivino.com/thumbs/axBtSSH6TiK_ryMdUaw-rg_pb_x300.png',
}

const R2_BASE = 'https://pub-03b10c2b0da74dc9afff31dc20d58313.r2.dev/labels'

mkdirSync(OUT_DIR, { recursive: true })

let ok = 0, fail = 0

for (const [id, url] of Object.entries(WINE_IMAGES)) {
  const ext      = url.endsWith('.jpg') ? 'jpg' : 'png'
  const filename = `${id}.${ext}`
  const local    = `${OUT_DIR}/${filename}`
  const r2Key    = `labels/${filename}`
  process.stdout.write(`[${id}/50] `)

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync(local, buf)
    execSync(`npx wrangler r2 object put "${R2_BUCKET}/${r2Key}" --file="${local}" --remote`, { stdio: 'pipe' })
    console.log(`✓  ${R2_BASE}/${filename}`)
    ok++
  } catch (e) {
    console.log(`✗  ${e.message}`)
    fail++
  }
}

console.log(`\n✅  Done: ${ok} uploaded, ${fail} failed`)
