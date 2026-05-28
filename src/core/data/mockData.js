import { inferColorFromGrape, inferMakerFromName } from '../engine/filterEngine.js'
import { WINE_IMAGES } from './wineImages.js'

// Explicit overrides for makers where the auto-inference is wrong
// (e.g. wines whose names start with "The" or otherwise don't lead with the maker).
const MAKER_OVERRIDES = {
  'The Prisoner Red Blend':                              'The Prisoner Wine Co.',
  "Stag's Leap Artemis Cabernet":                        "Stag's Leap Wine Cellars",
  'Whispering Angel Rosé':                               'Château d\'Esclans',
  'The Walking Dead Shiraz':                             'The Walking Dead',
  'Layer Cake Malbec':                                   'Layer Cake',
  'Apothic Red':                                         'Apothic',
  'Seven Deadly Zins Old Vine Zinfandel':                'Michael David Winery',
  'Cune (CVNE) Monopole White Rioja':                    'CVNE',
  'Bartenura Moscato d\'Asti':                           'Bartenura',
  'Marchesi de\' Frescobaldi Nipozzano Chianti Riserva': 'Frescobaldi',
}

// Wines with documented certifications (organic / biodynamic / natural / low-sulfite).
// Conservative — only wineries with public, verifiable practices.
const CERTIFICATION_OVERRIDES = {
  'Frog\'s Leap Zinfandel':            ['organic'],
  'Ridge Geyserville':                 ['organic'],
  'Bonterra':                          ['organic', 'biodynamic'],
}

const RAW_WINES = [
  // ── California Reds ──────────────────────────────────────────────
  { id:1, name:'Caymus Cabernet Sauvignon', vintage:'2022', region:'Napa Valley, CA', grape:'Cabernet Sauvignon', price:'$92', priceNum:92, rating:93, ratingLabel:'Outstanding', body:85, sweetness:22, tannin:65, acidity:48, earthiness:12, funk:3, mineral:10, oak:65, floral:5, isValue:false, isCrowd:true, tasting:'Rich blackcurrant, mocha, and velvety smooth finish — polished and immediately accessible.', pairings:['Grilled steak','BBQ brisket','Dark chocolate','Mushroom pasta'], retailers:['costco','grocery','restaurant','wine_shop'] },
  { id:2, name:"Stag's Leap Artemis Cabernet", vintage:'2021', region:'Napa Valley, CA', grape:'Cabernet Sauvignon', price:'$65', priceNum:65, rating:94, ratingLabel:'Outstanding', body:85, sweetness:14, tannin:80, acidity:58, earthiness:22, funk:5, mineral:25, oak:48, floral:8, isValue:false, isCrowd:false, tasting:'Cassis, dried herbs, and cedar with firm tannins and a lingering, structured finish.', pairings:['Filet mignon','Lamb rack','Aged gouda','Wild mushroom risotto'], retailers:['whole_foods','restaurant','wine_shop'] },
  { id:3, name:'Silver Oak Cabernet Sauvignon', vintage:'2019', region:'Alexander Valley, CA', grape:'Cabernet Sauvignon', price:'$75', priceNum:75, rating:92, ratingLabel:'Highly rated', body:82, sweetness:18, tannin:72, acidity:52, earthiness:18, funk:3, mineral:15, oak:70, floral:5, isValue:false, isCrowd:true, tasting:'Vanilla oak, dark cherry, and cassis with supple tannins and a long, elegant finish.', pairings:['Grilled ribeye','Lamb chops','Aged cheddar','Mushroom risotto'], retailers:['costco','whole_foods','restaurant','wine_shop'] },
  { id:4, name:'Jordan Cabernet Sauvignon', vintage:'2019', region:'Alexander Valley, CA', grape:'Cabernet Sauvignon', price:'$55', priceNum:55, rating:91, ratingLabel:'Highly rated', body:80, sweetness:16, tannin:68, acidity:54, earthiness:20, funk:5, mineral:20, oak:45, floral:8, isValue:false, isCrowd:true, tasting:'Classic Sonoma Cab — currant, plum, herbs, and balanced oak with refined, approachable tannins.', pairings:['Rack of lamb','Grilled ribeye','Roasted vegetables','Aged cheese'], retailers:['whole_foods','restaurant','wine_shop'] },
  { id:5, name:'Duckhorn Cabernet Sauvignon', vintage:'2021', region:'Napa Valley, CA', grape:'Cabernet Sauvignon', price:'$75', priceNum:75, rating:92, ratingLabel:'Highly rated', body:83, sweetness:16, tannin:74, acidity:55, earthiness:28, funk:5, mineral:30, oak:42, floral:8, isValue:false, isCrowd:false, tasting:'Dark plum, blackberry, cedar, and earthy minerality with silky tannins and great structure.', pairings:['Grilled ribeye','Braised short rib','Aged cheese','Lamb'], retailers:['whole_foods','restaurant','wine_shop'] },
  { id:6, name:'Daou Cabernet Sauvignon', vintage:'2022', region:'Paso Robles, CA', grape:'Cabernet Sauvignon', price:'$28', priceNum:28, rating:92, ratingLabel:'Highly rated', body:80, sweetness:18, tannin:70, acidity:52, earthiness:10, funk:3, mineral:12, oak:55, floral:5, isValue:true, isCrowd:true, tasting:'Blackberry jam, dark chocolate, and vanilla oak with a smooth, crowd-pleasing finish.', pairings:['Burgers','Grilled chicken','Pizza','Mild cheddar'], retailers:['costco','whole_foods','grocery','restaurant'] },
  { id:7, name:'Josh Cellars Cabernet Sauvignon', vintage:'2022', region:'California', grape:'Cabernet Sauvignon', price:'$15', priceNum:15, rating:88, ratingLabel:'Widely praised', body:75, sweetness:20, tannin:58, acidity:50, earthiness:8, funk:2, mineral:8, oak:38, floral:5, isValue:true, isCrowd:true, tasting:'Soft dark fruit, cedar, and subtle mocha — smooth and easy-drinking at a great price.', pairings:['Burgers','Pizza','Grilled chicken','Pasta'], retailers:['costco','trader_joes','whole_foods','grocery'] },
  { id:8, name:'Meiomi Pinot Noir', vintage:'2022', region:'California', grape:'Pinot Noir', price:'$18', priceNum:18, rating:88, ratingLabel:'Widely praised', body:45, sweetness:22, tannin:32, acidity:68, earthiness:18, funk:5, mineral:12, oak:15, floral:15, isValue:true, isCrowd:true, tasting:'Strawberry, blackberry, and mocha with a creamy, smooth finish — one of America\'s best-selling Pinots.', pairings:['Salmon','Grilled chicken','Mushroom pasta','Charcuterie'], retailers:['costco','trader_joes','whole_foods','grocery','restaurant'] },
  { id:9, name:'La Crema Pinot Noir', vintage:'2022', region:'Sonoma Coast, CA', grape:'Pinot Noir', price:'$22', priceNum:22, rating:90, ratingLabel:'Excellent', body:48, sweetness:16, tannin:35, acidity:72, earthiness:30, funk:5, mineral:20, oak:22, floral:12, isValue:true, isCrowd:true, tasting:'Bright cherry, raspberry, and earthy spice with vibrant acidity and a silky finish.', pairings:['Salmon','Duck','Mushroom risotto','Charcuterie'], retailers:['costco','whole_foods','grocery','restaurant'] },
  { id:10, name:'Belle Glos Clark & Telephone Pinot Noir', vintage:'2022', region:'Santa Maria Valley, CA', grape:'Pinot Noir', price:'$45', priceNum:45, rating:92, ratingLabel:'Highly rated', body:52, sweetness:14, tannin:38, acidity:74, earthiness:45, funk:8, mineral:25, oak:28, floral:15, isValue:false, isCrowd:false, tasting:'Lush dark cherry, plum, and cola with forest floor earthiness and a long, expressive finish.', pairings:['Duck breast','Salmon','Mushroom risotto','Aged cheese'], retailers:['whole_foods','restaurant','wine_shop'] },
  { id:11, name:'The Prisoner Red Blend', vintage:'2022', region:'Napa Valley, CA', grape:'Zinfandel blend', price:'$35', priceNum:35, rating:90, ratingLabel:'Excellent', body:78, sweetness:26, tannin:55, acidity:52, earthiness:10, funk:5, mineral:8, oak:45, floral:5, isValue:false, isCrowd:true, tasting:'Bold dark fruit, vanilla, and mocha with a lush, opulent texture — a crowd magnet.', pairings:['BBQ ribs','Grilled steak','Dark chocolate','Charcuterie'], retailers:['costco','whole_foods','grocery','restaurant'] },
  { id:12, name:'Apothic Red', vintage:'2022', region:'California', grape:'Red blend', price:'$12', priceNum:12, rating:87, ratingLabel:'Widely praised', body:70, sweetness:30, tannin:45, acidity:48, earthiness:5, funk:2, mineral:5, oak:35, floral:5, isValue:true, isCrowd:true, tasting:'Dark berry, mocha, and vanilla with a smooth, sweet-edged finish designed to please everyone.', pairings:['Burgers','Pizza','BBQ','Pasta'], retailers:['costco','trader_joes','whole_foods','grocery'] },
  { id:13, name:'Ridge Geyserville', vintage:'2021', region:'Alexander Valley, CA', grape:'Zinfandel blend', price:'$40', priceNum:40, rating:93, ratingLabel:'Outstanding', body:80, sweetness:20, tannin:60, acidity:62, earthiness:42, funk:15, mineral:22, oak:32, floral:5, isValue:false, isCrowd:false, tasting:'Bramble fruit, pepper, and earthy complexity with bright acidity and great aging potential.', pairings:['BBQ ribs','Grilled sausage','Aged cheese','Pizza'], retailers:['whole_foods','wine_shop','restaurant'] },
  { id:14, name:'Seven Deadly Zins Old Vine Zinfandel', vintage:'2021', region:'Lodi, CA', grape:'Zinfandel', price:'$18', priceNum:18, rating:88, ratingLabel:'Widely praised', body:78, sweetness:24, tannin:58, acidity:56, earthiness:15, funk:8, mineral:8, oak:18, floral:5, isValue:true, isCrowd:true, tasting:'Jammy blackberry, pepper, and spice with a bold, fruit-forward style and smooth finish.', pairings:['BBQ','Burgers','Pizza','Grilled sausage'], retailers:['costco','whole_foods','grocery'] },
  // ── California Whites ────────────────────────────────────────────
  { id:15, name:'Rombauer Chardonnay', vintage:'2022', region:'Carneros, CA', grape:'Chardonnay', price:'$42', priceNum:42, rating:92, ratingLabel:'Highly rated', body:65, sweetness:22, tannin:8, acidity:52, earthiness:5, funk:2, mineral:10, oak:82, floral:8, isValue:false, isCrowd:true, tasting:'Buttery tropical fruit, vanilla oak, and a rich, creamy finish — the quintessential California Chardonnay.', pairings:['Grilled chicken','Lobster','Creamy pasta','Soft cheese'], retailers:['costco','whole_foods','grocery','restaurant'] },
  { id:16, name:'Kendall-Jackson Vintner\'s Reserve Chardonnay', vintage:'2022', region:'California', grape:'Chardonnay', price:'$18', priceNum:18, rating:89, ratingLabel:'Excellent', body:60, sweetness:20, tannin:6, acidity:54, earthiness:5, funk:2, mineral:8, oak:52, floral:10, isValue:true, isCrowd:true, tasting:'Peach, pineapple, and toasty oak with a smooth, slightly sweet finish and wide appeal.', pairings:['Grilled chicken','Salmon','Light pasta','Soft cheese'], retailers:['costco','trader_joes','whole_foods','grocery','restaurant'] },
  { id:17, name:'Sonoma-Cutrer Russian River Ranches Chardonnay', vintage:'2022', region:'Russian River Valley, CA', grape:'Chardonnay', price:'$28', priceNum:28, rating:91, ratingLabel:'Highly rated', body:62, sweetness:16, tannin:6, acidity:58, earthiness:8, funk:2, mineral:18, oak:42, floral:10, isValue:false, isCrowd:true, tasting:'Apple, citrus, and toasted hazelnut with elegant oak integration and a clean, focused finish.', pairings:['Halibut','Grilled chicken','Risotto','Brie'], retailers:['whole_foods','grocery','restaurant','wine_shop'] },
  { id:18, name:'La Crema Chardonnay', vintage:'2022', region:'Sonoma Coast, CA', grape:'Chardonnay', price:'$22', priceNum:22, rating:90, ratingLabel:'Excellent', body:60, sweetness:18, tannin:6, acidity:60, earthiness:8, funk:2, mineral:20, oak:28, floral:10, isValue:true, isCrowd:true, tasting:'Lemon curd, green apple, and light vanilla oak with a crisp, clean finish.', pairings:['Grilled chicken','Salmon','Creamy pasta','Soft cheese'], retailers:['costco','whole_foods','grocery','restaurant'] },
  { id:19, name:'Josh Cellars Chardonnay', vintage:'2022', region:'California', grape:'Chardonnay', price:'$14', priceNum:14, rating:87, ratingLabel:'Widely praised', body:58, sweetness:20, tannin:5, acidity:52, earthiness:5, funk:2, mineral:8, oak:35, floral:8, isValue:true, isCrowd:true, tasting:'Ripe pear, vanilla, and light oak with a smooth, easy finish — great everyday value.', pairings:['Grilled chicken','Light pasta','Salad','Soft cheese'], retailers:['costco','trader_joes','whole_foods','grocery'] },
  { id:20, name:'Cakebread Cellars Chardonnay', vintage:'2022', region:'Napa Valley, CA', grape:'Chardonnay', price:'$55', priceNum:55, rating:93, ratingLabel:'Outstanding', body:68, sweetness:14, tannin:7, acidity:62, earthiness:10, funk:3, mineral:28, oak:58, floral:10, isValue:false, isCrowd:true, tasting:'Elegant lemon, apple, and white peach with well-integrated oak and a minerally, long finish.', pairings:['Lobster','Halibut','Risotto','Grilled chicken'], retailers:['whole_foods','restaurant','wine_shop'] },
  { id:21, name:'Kim Crawford Sauvignon Blanc', vintage:'2023', region:'Marlborough, NZ', grape:'Sauvignon Blanc', price:'$16', priceNum:16, rating:89, ratingLabel:'Excellent', body:38, sweetness:10, tannin:3, acidity:82, earthiness:5, funk:3, mineral:28, oak:3, floral:15, isValue:true, isCrowd:true, tasting:'Zesty grapefruit, passionfruit, and fresh-cut grass — the benchmark value Marlborough SB.', pairings:['Oysters','Salad','Grilled fish','Goat cheese'], retailers:['costco','trader_joes','whole_foods','grocery','restaurant'] },
  { id:22, name:'Duckhorn Vineyards Sauvignon Blanc', vintage:'2023', region:'Napa Valley, CA', grape:'Sauvignon Blanc', price:'$35', priceNum:35, rating:91, ratingLabel:'Highly rated', body:42, sweetness:10, tannin:4, acidity:78, earthiness:8, funk:3, mineral:30, oak:5, floral:15, isValue:false, isCrowd:false, tasting:'Lemon zest, grapefruit, and white peach with a crisp, herbaceous undertone and clean finish.', pairings:['Oysters','Sushi','Grilled salmon','Goat cheese'], retailers:['whole_foods','restaurant','wine_shop'] },
  // ── Italian ──────────────────────────────────────────────────────
  { id:23, name:'Antinori Tignanello', vintage:'2020', region:'Tuscany, Italy', grape:'Sangiovese blend', price:'$95', priceNum:95, rating:95, ratingLabel:'Outstanding', body:82, sweetness:10, tannin:78, acidity:68, earthiness:62, funk:10, mineral:30, oak:40, floral:8, isValue:false, isCrowd:false, tasting:'Dark cherry, tobacco, and leather with earthy complexity, firm tannins, and a commanding finish.', pairings:['Bistecca','Lamb rack','Aged pecorino','Wild mushroom risotto'], retailers:['restaurant','wine_shop'] },
  { id:24, name:'Banfi Brunello di Montalcino', vintage:'2018', region:'Montalcino, Italy', grape:'Sangiovese Grosso', price:'$70', priceNum:70, rating:94, ratingLabel:'Outstanding', body:80, sweetness:8, tannin:82, acidity:72, earthiness:65, funk:12, mineral:38, oak:30, floral:20, isValue:false, isCrowd:false, tasting:'Dried cherry, rose petal, and iron with powerful structure and exceptional aging potential.', pairings:['Braised short rib','Lamb tagine','Aged cheese','Porchetta'], retailers:['whole_foods','restaurant','wine_shop'] },
  { id:25, name:'Ruffino Chianti Classico Riserva', vintage:'2020', region:'Chianti Classico, Italy', grape:'Sangiovese', price:'$24', priceNum:24, rating:90, ratingLabel:'Excellent', body:72, sweetness:10, tannin:70, acidity:70, earthiness:55, funk:8, mineral:22, oak:20, floral:10, isValue:true, isCrowd:false, tasting:'Tart cherry, leather, and dried herbs with vibrant acidity and a classic, food-friendly finish.', pairings:['Pizza','Pasta bolognese','Grilled chicken','Aged cheese'], retailers:['costco','whole_foods','grocery','restaurant'] },
  { id:26, name:'Santa Margherita Pinot Grigio', vintage:'2023', region:'Alto Adige, Italy', grape:'Pinot Grigio', price:'$25', priceNum:25, rating:89, ratingLabel:'Excellent', body:40, sweetness:8, tannin:3, acidity:70, earthiness:8, funk:3, mineral:35, oak:5, floral:25, isValue:false, isCrowd:true, tasting:'Green apple, lemon, and white flowers with a clean, refreshing finish — the original Pinot Grigio icon.', pairings:['Oysters','Grilled fish','Light pasta','Salad'], retailers:['costco','whole_foods','grocery','restaurant'] },
  { id:27, name:'Meiomi Moscato', vintage:'2023', region:'California', grape:'Moscato', price:'$15', priceNum:15, rating:87, ratingLabel:'Widely praised', body:30, sweetness:75, tannin:2, acidity:55, earthiness:2, funk:2, mineral:5, oak:5, floral:55, isValue:true, isCrowd:true, tasting:'Peach, apricot, and orange blossom with a lightly sweet, effervescent, crowd-pleasing finish.', pairings:['Fresh fruit','Soft cheese','Light desserts','Spicy food'], retailers:['costco','trader_joes','whole_foods','grocery'] },
  { id:28, name:'Marchesi de\' Frescobaldi Nipozzano Chianti Riserva', vintage:'2019', region:'Chianti Rufina, Italy', grape:'Sangiovese', price:'$22', priceNum:22, rating:91, ratingLabel:'Highly rated', body:74, sweetness:10, tannin:72, acidity:68, earthiness:48, funk:8, mineral:22, oak:18, floral:10, isValue:true, isCrowd:false, tasting:'Ripe cherry, plum, and earthy spice with a smooth, medium-weight body and a long, refined finish.', pairings:['Pasta bolognese','Grilled chicken','Pizza','Lamb'], retailers:['whole_foods','grocery','restaurant','wine_shop'] },
  { id:29, name:'Gabbiano Chianti', vintage:'2022', region:'Tuscany, Italy', grape:'Sangiovese', price:'$12', priceNum:12, rating:86, ratingLabel:'Widely praised', body:65, sweetness:12, tannin:60, acidity:66, earthiness:40, funk:5, mineral:15, oak:12, floral:8, isValue:true, isCrowd:true, tasting:'Bright cherry, red plum, and light herbs — a simple, food-friendly everyday Chianti.', pairings:['Pizza','Pasta','Burgers','Grilled chicken'], retailers:['costco','trader_joes','whole_foods','grocery'] },
  { id:30, name:'Bartenura Moscato d\'Asti', vintage:'2023', region:'Piedmont, Italy', grape:'Moscato Bianco', price:'$18', priceNum:18, rating:88, ratingLabel:'Widely praised', body:25, sweetness:80, tannin:1, acidity:58, earthiness:2, funk:2, mineral:5, oak:3, floral:68, isValue:true, isCrowd:true, tasting:'Delicate peach, melon, and honey with gentle effervescence — the perfect light aperitif.', pairings:['Fresh fruit','Light desserts','Soft cheese','Spicy food'], retailers:['costco','trader_joes','whole_foods','grocery'] },
  // ── French ───────────────────────────────────────────────────────
  { id:31, name:'Louis Jadot Beaujolais-Villages', vintage:'2022', region:'Beaujolais, France', grape:'Gamay', price:'$15', priceNum:15, rating:87, ratingLabel:'Widely praised', body:42, sweetness:12, tannin:28, acidity:72, earthiness:22, funk:18, mineral:20, oak:5, floral:30, isValue:true, isCrowd:true, tasting:'Fresh red berry, banana, and violet with a light, joyful body and easy finish.', pairings:['Charcuterie','Grilled chicken','Light pasta','Cheese'], retailers:['whole_foods','grocery','restaurant'] },
  { id:32, name:'Whispering Angel Rosé', vintage:'2023', region:'Provence, France', grape:'Grenache blend', price:'$28', priceNum:28, rating:90, ratingLabel:'Excellent', body:38, sweetness:10, tannin:14, acidity:68, earthiness:12, funk:5, mineral:30, oak:8, floral:22, isValue:false, isCrowd:true, tasting:'Pale pink with strawberry, white peach, and herbal notes — the definitive Provence rosé.', pairings:['Grilled salmon','Light salad','Soft cheese','Charcuterie'], retailers:['costco','whole_foods','grocery','restaurant'] },
  { id:33, name:'Meiomi Rosé', vintage:'2023', region:'California', grape:'Pinot Noir rosé', price:'$16', priceNum:16, rating:88, ratingLabel:'Widely praised', body:36, sweetness:14, tannin:10, acidity:66, earthiness:8, funk:3, mineral:18, oak:5, floral:18, isValue:true, isCrowd:true, tasting:'Strawberry, watermelon, and light citrus with a crisp, refreshing finish at a great price.', pairings:['Grilled chicken','Salad','Light pasta','Soft cheese'], retailers:['costco','trader_joes','whole_foods','grocery'] },
  { id:34, name:'Château Ste. Michelle Riesling', vintage:'2022', region:'Columbia Valley, WA', grape:'Riesling', price:'$12', priceNum:12, rating:88, ratingLabel:'Widely praised', body:32, sweetness:40, tannin:2, acidity:78, earthiness:5, funk:2, mineral:45, oak:2, floral:22, isValue:true, isCrowd:true, tasting:'Peach, apricot, and lemon with off-dry sweetness and bright, refreshing acidity.', pairings:['Spicy food','Thai food','Grilled salmon','Soft cheese'], retailers:['costco','trader_joes','whole_foods','grocery','restaurant'] },
  { id:35, name:'Trimbach Riesling', vintage:'2020', region:'Alsace, France', grape:'Riesling', price:'$28', priceNum:28, rating:92, ratingLabel:'Highly rated', body:36, sweetness:14, tannin:2, acidity:82, earthiness:8, funk:5, mineral:62, oak:2, floral:18, isValue:false, isCrowd:false, tasting:'Bone-dry with laser-sharp citrus, green apple, and petrol notes — a classic Alsace benchmark.', pairings:['Oysters','Grilled fish','Sushi','Spicy food'], retailers:['whole_foods','restaurant','wine_shop'] },
  { id:36, name:'Bouchard Père & Fils Mâcon-Villages Chardonnay', vintage:'2022', region:'Burgundy, France', grape:'Chardonnay', price:'$20', priceNum:20, rating:89, ratingLabel:'Excellent', body:50, sweetness:10, tannin:5, acidity:66, earthiness:18, funk:5, mineral:52, oak:8, floral:12, isValue:true, isCrowd:false, tasting:'Crisp green apple, pear, and light mineral notes — a lean, unoaked Burgundian style.', pairings:['Oysters','Grilled fish','Light salad','Soft cheese'], retailers:['whole_foods','restaurant','wine_shop'] },
  // ── Spanish ──────────────────────────────────────────────────────
  { id:37, name:'Muga Rioja Reserva', vintage:'2019', region:'Rioja, Spain', grape:'Tempranillo blend', price:'$28', priceNum:28, rating:92, ratingLabel:'Highly rated', body:76, sweetness:12, tannin:68, acidity:62, earthiness:48, funk:10, mineral:18, oak:52, floral:12, isValue:true, isCrowd:false, tasting:'Cherry, plum, vanilla oak, and leather with a silky texture and food-friendly finish.', pairings:['Lamb','Grilled steak','Aged cheese','Mushroom risotto'], retailers:['whole_foods','grocery','restaurant','wine_shop'] },
  { id:38, name:'Bodegas Lan Rioja Crianza', vintage:'2020', region:'Rioja, Spain', grape:'Tempranillo', price:'$16', priceNum:16, rating:88, ratingLabel:'Widely praised', body:70, sweetness:12, tannin:62, acidity:60, earthiness:35, funk:5, mineral:15, oak:30, floral:10, isValue:true, isCrowd:true, tasting:'Ripe red cherry, light vanilla, and subtle spice — an approachable, everyday Rioja.', pairings:['Burgers','Grilled chicken','Pasta','Pizza'], retailers:['costco','whole_foods','grocery'] },
  { id:39, name:'Cune (CVNE) Monopole White Rioja', vintage:'2022', region:'Rioja, Spain', grape:'Viura', price:'$18', priceNum:18, rating:89, ratingLabel:'Excellent', body:42, sweetness:10, tannin:3, acidity:72, earthiness:10, funk:3, mineral:28, oak:8, floral:20, isValue:true, isCrowd:false, tasting:'Lemon, white peach, and fresh herbs with vibrant acidity and a clean, lingering finish.', pairings:['Grilled fish','Oysters','Light salad','Soft cheese'], retailers:['whole_foods','restaurant','wine_shop'] },
  { id:40, name:'Torres Gran Sangre de Toro', vintage:'2020', region:'Catalunya, Spain', grape:'Garnacha blend', price:'$15', priceNum:15, rating:87, ratingLabel:'Widely praised', body:74, sweetness:16, tannin:60, acidity:58, earthiness:20, funk:5, mineral:10, oak:22, floral:5, isValue:true, isCrowd:true, tasting:'Ripe dark fruit, spice, and a smooth, fruit-forward style great for everyday enjoyment.', pairings:['BBQ','Burgers','Grilled chicken','Pizza'], retailers:['costco','trader_joes','whole_foods','grocery'] },
  // ── Argentine ────────────────────────────────────────────────────
  { id:41, name:'Catena Zapata Adrianna Vineyard Malbec', vintage:'2020', region:'Mendoza, Argentina', grape:'Malbec', price:'$180', priceNum:180, rating:98, ratingLabel:'Extraordinary', body:88, sweetness:12, tannin:80, acidity:64, earthiness:35, funk:10, mineral:42, oak:28, floral:25, isValue:false, isCrowd:false, tasting:'Intensely complex dark fruit, violet, iron, and graphite — one of South America\'s greatest wines.', pairings:['Filet mignon','Lamb rack','Aged cheese','Grilled ribeye'], retailers:['restaurant','wine_shop'] },
  { id:42, name:'Zuccardi Valle de Uco Malbec', vintage:'2021', region:'Mendoza, Argentina', grape:'Malbec', price:'$22', priceNum:22, rating:91, ratingLabel:'Highly rated', body:82, sweetness:14, tannin:70, acidity:60, earthiness:28, funk:8, mineral:38, oak:18, floral:22, isValue:true, isCrowd:false, tasting:'Plum, dark cherry, and violet with a rich texture, silky tannins, and a focused mineral finish.', pairings:['Grilled steak','Lamb','BBQ ribs','Dark chocolate'], retailers:['whole_foods','restaurant','wine_shop'] },
  { id:43, name:'Achaval Ferrer Malbec', vintage:'2022', region:'Mendoza, Argentina', grape:'Malbec', price:'$30', priceNum:30, rating:92, ratingLabel:'Highly rated', body:83, sweetness:14, tannin:68, acidity:62, earthiness:20, funk:5, mineral:18, oak:25, floral:10, isValue:false, isCrowd:false, tasting:'Blackberry, plum, and mocha with a supple, velvety texture and a long, spiced finish.', pairings:['Grilled ribeye','BBQ','Lamb','Dark chocolate'], retailers:['whole_foods','restaurant','wine_shop'] },
  { id:44, name:'Clos de los Siete', vintage:'2021', region:'Mendoza, Argentina', grape:'Malbec blend', price:'$20', priceNum:20, rating:90, ratingLabel:'Excellent', body:80, sweetness:16, tannin:65, acidity:58, earthiness:18, funk:5, mineral:12, oak:22, floral:8, isValue:true, isCrowd:true, tasting:'Ripe plum, blackberry, and dark spice with an approachable, full-bodied style.', pairings:['Grilled steak','Burgers','BBQ','Pasta'], retailers:['costco','whole_foods','grocery'] },
  // ── Australian & New Zealand ─────────────────────────────────────
  { id:45, name:'Penfolds Grange', vintage:'2019', region:'South Australia', grape:'Shiraz', price:'$850', priceNum:850, rating:99, ratingLabel:'Extraordinary', body:95, sweetness:10, tannin:90, acidity:60, earthiness:30, funk:8, mineral:20, oak:55, floral:5, isValue:false, isCrowd:false, tasting:'Epic concentration of dark fruit, tar, chocolate, and spice — Australia\'s most iconic wine.', pairings:['Grilled ribeye','Braised short rib','Aged cheese','Lamb rack'], retailers:['restaurant','wine_shop'] },
  { id:46, name:'Penfolds Bin 28 Kalimna Shiraz', vintage:'2021', region:'South Australia', grape:'Shiraz', price:'$30', priceNum:30, rating:91, ratingLabel:'Highly rated', body:84, sweetness:14, tannin:72, acidity:56, earthiness:22, funk:8, mineral:12, oak:32, floral:5, isValue:true, isCrowd:false, tasting:'Rich dark plum, chocolate, and pepper with a full-bodied, generous texture and smooth finish.', pairings:['Grilled steak','BBQ ribs','Lamb','Dark chocolate'], retailers:['whole_foods','grocery','restaurant','wine_shop'] },
  { id:47, name:'The Walking Dead Shiraz', vintage:'2022', region:'South Eastern Australia', grape:'Shiraz', price:'$14', priceNum:14, rating:87, ratingLabel:'Widely praised', body:78, sweetness:18, tannin:62, acidity:52, earthiness:12, funk:5, mineral:8, oak:25, floral:5, isValue:true, isCrowd:true, tasting:'Juicy dark berry, pepper, and vanilla — bold, fruit-forward, and irresistibly easy to drink.', pairings:['BBQ','Burgers','Grilled chicken','Pizza'], retailers:['costco','trader_joes','whole_foods','grocery'] },
  { id:48, name:'Cloudy Bay Sauvignon Blanc', vintage:'2023', region:'Marlborough, NZ', grape:'Sauvignon Blanc', price:'$30', priceNum:30, rating:92, ratingLabel:'Highly rated', body:40, sweetness:8, tannin:3, acidity:84, earthiness:5, funk:5, mineral:35, oak:5, floral:20, isValue:false, isCrowd:true, tasting:'Explosive passionfruit, grapefruit, and fresh herbs — the wine that made Marlborough SB famous.', pairings:['Oysters','Grilled fish','Sushi','Goat cheese'], retailers:['whole_foods','grocery','restaurant','wine_shop'] },
  // ── Crowd-pleasing Values ────────────────────────────────────────
  { id:49, name:'Barefoot Bubbly Brut Rosé', vintage:'NV', region:'California', grape:'Sparkling rosé blend', price:'$10', priceNum:10, rating:85, ratingLabel:'Popular pick', body:28, sweetness:35, tannin:5, acidity:62, earthiness:3, funk:2, mineral:12, oak:3, floral:20, isValue:true, isCrowd:true, tasting:'Strawberry, light citrus, and toasty bubbles — fun, festive, and affordable.', pairings:['Brunch','Fresh fruit','Light desserts','Charcuterie'], retailers:['costco','trader_joes','whole_foods','grocery'] },
  { id:50, name:'Layer Cake Malbec', vintage:'2022', region:'Mendoza, Argentina', grape:'Malbec', price:'$13', priceNum:13, rating:87, ratingLabel:'Widely praised', body:76, sweetness:18, tannin:60, acidity:54, earthiness:15, funk:3, mineral:8, oak:25, floral:8, isValue:true, isCrowd:true, tasting:'Ripe plum, blueberry, and cocoa with a smooth, crowd-pleasing finish at a great everyday price.', pairings:['Burgers','BBQ','Grilled chicken','Pizza'], retailers:['costco','trader_joes','whole_foods','grocery'] },
]

// Enrich every wine with derived filter fields. UI never re-derives these —
// it just reads w.color / w.maker / w.certifications / w.imageUrl.
export const wines = RAW_WINES.map((w) => ({
  ...w,
  color:          w.color || inferColorFromGrape(w.grape),
  maker:          w.maker || MAKER_OVERRIDES[w.name] || inferMakerFromName(w.name, w.grape),
  certifications: w.certifications || CERTIFICATION_OVERRIDES[w.name] || [],
  imageUrl:       w.imageUrl || WINE_IMAGES[w.id] || null,
}))

// Search-only entries: well-known bottles users may have tried but that aren't
// in the recommendation catalog. UI uses these for the palate-rating step;
// they have palate axes (body/sweetness/tannin/acidity) so the inference
// engine can learn from them, but no pricing/retailer/pairing fields.
export const extraSearchWines = [
  // ── More California Reds ───────────────────────────────────────────
  { id:101, name:'Opus One', vintage:'2019', region:'Napa Valley, CA', grape:'Cabernet blend', body:88, sweetness:12, tannin:82, acidity:60 },
  { id:102, name:'Screaming Eagle Cabernet', vintage:'2018', region:'Napa Valley, CA', grape:'Cabernet Sauvignon', body:90, sweetness:10, tannin:85, acidity:60 },
  { id:103, name:'Dominus Estate', vintage:'2019', region:'Napa Valley, CA', grape:'Cabernet blend', body:86, sweetness:10, tannin:80, acidity:62 },
  { id:104, name:'Heitz Cellar Martha\'s Vineyard Cabernet', vintage:'2017', region:'Napa Valley, CA', grape:'Cabernet Sauvignon', body:84, sweetness:12, tannin:78, acidity:58 },
  { id:105, name:'Ridge Monte Bello', vintage:'2019', region:'Santa Cruz Mountains, CA', grape:'Cabernet blend', body:82, sweetness:10, tannin:78, acidity:64 },
  { id:106, name:'Kosta Browne Russian River Pinot Noir', vintage:'2021', region:'Russian River Valley, CA', grape:'Pinot Noir', body:55, sweetness:14, tannin:42, acidity:74 },
  { id:107, name:'Williams Selyem Pinot Noir', vintage:'2021', region:'Russian River Valley, CA', grape:'Pinot Noir', body:52, sweetness:12, tannin:40, acidity:75 },
  { id:108, name:'Sea Smoke Southing Pinot Noir', vintage:'2021', region:'Sta. Rita Hills, CA', grape:'Pinot Noir', body:58, sweetness:14, tannin:44, acidity:72 },
  { id:109, name:'Au Bon Climat Pinot Noir', vintage:'2021', region:'Santa Barbara, CA', grape:'Pinot Noir', body:50, sweetness:12, tannin:38, acidity:74 },
  { id:110, name:'Frog\'s Leap Zinfandel', vintage:'2021', region:'Napa Valley, CA', grape:'Zinfandel', body:74, sweetness:18, tannin:55, acidity:60 },
  { id:111, name:'Turley Old Vines Zinfandel', vintage:'2021', region:'California', grape:'Zinfandel', body:82, sweetness:20, tannin:62, acidity:58 },
  { id:112, name:'Justin Isosceles', vintage:'2020', region:'Paso Robles, CA', grape:'Cabernet blend', body:84, sweetness:14, tannin:74, acidity:58 },
  { id:113, name:'Orin Swift Abstract', vintage:'2021', region:'California', grape:'Red blend', body:80, sweetness:22, tannin:60, acidity:54 },
  { id:114, name:'Orin Swift Papillon', vintage:'2021', region:'Napa Valley, CA', grape:'Bordeaux blend', body:84, sweetness:14, tannin:76, acidity:58 },

  // ── More California Whites ─────────────────────────────────────────
  { id:120, name:'Chateau Montelena Chardonnay', vintage:'2021', region:'Napa Valley, CA', grape:'Chardonnay', body:62, sweetness:12, tannin:6, acidity:64 },
  { id:121, name:'Far Niente Chardonnay', vintage:'2022', region:'Napa Valley, CA', grape:'Chardonnay', body:68, sweetness:18, tannin:7, acidity:58 },
  { id:122, name:'Stag\'s Leap Karia Chardonnay', vintage:'2022', region:'Napa Valley, CA', grape:'Chardonnay', body:60, sweetness:14, tannin:6, acidity:62 },
  { id:123, name:'Honig Sauvignon Blanc', vintage:'2023', region:'Napa Valley, CA', grape:'Sauvignon Blanc', body:42, sweetness:10, tannin:4, acidity:78 },
  { id:124, name:'Chateau St. Jean Fumé Blanc', vintage:'2022', region:'Sonoma, CA', grape:'Sauvignon Blanc', body:44, sweetness:10, tannin:4, acidity:74 },

  // ── Bordeaux ───────────────────────────────────────────────────────
  { id:130, name:'Château Margaux', vintage:'2018', region:'Margaux, Bordeaux', grape:'Bordeaux blend', body:80, sweetness:8, tannin:80, acidity:68 },
  { id:131, name:'Château Lafite Rothschild', vintage:'2018', region:'Pauillac, Bordeaux', grape:'Bordeaux blend', body:80, sweetness:8, tannin:82, acidity:68 },
  { id:132, name:'Château Mouton Rothschild', vintage:'2018', region:'Pauillac, Bordeaux', grape:'Bordeaux blend', body:84, sweetness:10, tannin:82, acidity:66 },
  { id:133, name:'Château Latour', vintage:'2017', region:'Pauillac, Bordeaux', grape:'Bordeaux blend', body:84, sweetness:8, tannin:84, acidity:66 },
  { id:134, name:'Château Haut-Brion', vintage:'2018', region:'Pessac-Léognan, Bordeaux', grape:'Bordeaux blend', body:80, sweetness:8, tannin:78, acidity:68 },
  { id:135, name:'Château Pichon Baron', vintage:'2019', region:'Pauillac, Bordeaux', grape:'Bordeaux blend', body:80, sweetness:10, tannin:78, acidity:66 },
  { id:136, name:'Château d\'Yquem', vintage:'2017', region:'Sauternes, Bordeaux', grape:'Sémillon blend', body:60, sweetness:92, tannin:5, acidity:72 },

  // ── Burgundy ───────────────────────────────────────────────────────
  { id:140, name:'Domaine de la Romanée-Conti La Tâche', vintage:'2019', region:'Vosne-Romanée, Burgundy', grape:'Pinot Noir', body:60, sweetness:10, tannin:55, acidity:80 },
  { id:141, name:'Louis Jadot Gevrey-Chambertin', vintage:'2020', region:'Côte de Nuits, Burgundy', grape:'Pinot Noir', body:55, sweetness:10, tannin:50, acidity:74 },
  { id:142, name:'Joseph Drouhin Chablis', vintage:'2022', region:'Chablis, Burgundy', grape:'Chardonnay', body:48, sweetness:8, tannin:4, acidity:78 },
  { id:143, name:'Olivier Leflaive Puligny-Montrachet', vintage:'2021', region:'Côte de Beaune, Burgundy', grape:'Chardonnay', body:62, sweetness:10, tannin:5, acidity:70 },
  { id:144, name:'Bouchard Meursault', vintage:'2021', region:'Côte de Beaune, Burgundy', grape:'Chardonnay', body:64, sweetness:12, tannin:5, acidity:68 },

  // ── Champagne & Sparkling ──────────────────────────────────────────
  { id:150, name:'Dom Pérignon', vintage:'2013', region:'Champagne, France', grape:'Champagne blend', body:48, sweetness:14, tannin:5, acidity:78 },
  { id:151, name:'Krug Grande Cuvée', vintage:'NV', region:'Champagne, France', grape:'Champagne blend', body:54, sweetness:12, tannin:5, acidity:76 },
  { id:152, name:'Veuve Clicquot Yellow Label Brut', vintage:'NV', region:'Champagne, France', grape:'Champagne blend', body:46, sweetness:14, tannin:4, acidity:74 },
  { id:153, name:'Moët & Chandon Impérial Brut', vintage:'NV', region:'Champagne, France', grape:'Champagne blend', body:44, sweetness:16, tannin:4, acidity:72 },
  { id:154, name:'Ruinart Blanc de Blancs', vintage:'NV', region:'Champagne, France', grape:'Chardonnay', body:42, sweetness:10, tannin:3, acidity:80 },
  { id:155, name:'La Marca Prosecco', vintage:'NV', region:'Veneto, Italy', grape:'Glera', body:34, sweetness:24, tannin:3, acidity:64 },
  { id:156, name:'Mionetto Prosecco', vintage:'NV', region:'Veneto, Italy', grape:'Glera', body:32, sweetness:22, tannin:3, acidity:62 },
  { id:157, name:'Freixenet Cordon Negro Cava', vintage:'NV', region:'Catalunya, Spain', grape:'Cava blend', body:36, sweetness:14, tannin:3, acidity:68 },
  { id:158, name:'Schramsberg Blanc de Blancs', vintage:'2019', region:'North Coast, CA', grape:'Chardonnay', body:42, sweetness:10, tannin:4, acidity:76 },

  // ── Italian ────────────────────────────────────────────────────────
  { id:160, name:'Sassicaia (Tenuta San Guido)', vintage:'2020', region:'Bolgheri, Tuscany', grape:'Cabernet blend', body:84, sweetness:10, tannin:80, acidity:66 },
  { id:161, name:'Ornellaia', vintage:'2020', region:'Bolgheri, Tuscany', grape:'Bordeaux blend', body:84, sweetness:10, tannin:78, acidity:66 },
  { id:162, name:'Masseto', vintage:'2019', region:'Bolgheri, Tuscany', grape:'Merlot', body:86, sweetness:12, tannin:78, acidity:62 },
  { id:163, name:'Gaja Barbaresco', vintage:'2019', region:'Piedmont, Italy', grape:'Nebbiolo', body:78, sweetness:8, tannin:84, acidity:74 },
  { id:164, name:'Bruno Giacosa Barolo', vintage:'2018', region:'Piedmont, Italy', grape:'Nebbiolo', body:80, sweetness:8, tannin:88, acidity:72 },
  { id:165, name:'Vietti Barolo Castiglione', vintage:'2019', region:'Piedmont, Italy', grape:'Nebbiolo', body:78, sweetness:8, tannin:84, acidity:72 },
  { id:166, name:'Allegrini Amarone della Valpolicella', vintage:'2018', region:'Veneto, Italy', grape:'Corvina blend', body:88, sweetness:22, tannin:72, acidity:62 },
  { id:167, name:'Masi Costasera Amarone', vintage:'2018', region:'Veneto, Italy', grape:'Corvina blend', body:86, sweetness:24, tannin:70, acidity:62 },

  // ── Rhône & Other French ───────────────────────────────────────────
  { id:170, name:'Château de Beaucastel Châteauneuf-du-Pape', vintage:'2020', region:'Rhône, France', grape:'Grenache blend', body:82, sweetness:12, tannin:70, acidity:62 },
  { id:171, name:'E. Guigal Côtes du Rhône', vintage:'2021', region:'Rhône, France', grape:'Grenache blend', body:72, sweetness:12, tannin:58, acidity:62 },
  { id:172, name:'M. Chapoutier Crozes-Hermitage', vintage:'2021', region:'Rhône, France', grape:'Syrah', body:78, sweetness:12, tannin:68, acidity:64 },
  { id:173, name:'Sancerre (Henri Bourgeois)', vintage:'2022', region:'Loire, France', grape:'Sauvignon Blanc', body:42, sweetness:8, tannin:3, acidity:82 },
  { id:174, name:'Pouilly-Fumé (de Ladoucette)', vintage:'2022', region:'Loire, France', grape:'Sauvignon Blanc', body:44, sweetness:8, tannin:3, acidity:80 },

  // ── Spanish ────────────────────────────────────────────────────────
  { id:180, name:'Vega Sicilia Único', vintage:'2012', region:'Ribera del Duero, Spain', grape:'Tempranillo blend', body:84, sweetness:10, tannin:80, acidity:66 },
  { id:181, name:'Pingus', vintage:'2019', region:'Ribera del Duero, Spain', grape:'Tempranillo', body:88, sweetness:12, tannin:82, acidity:62 },
  { id:182, name:'Marqués de Cáceres Rioja Reserva', vintage:'2018', region:'Rioja, Spain', grape:'Tempranillo blend', body:74, sweetness:12, tannin:66, acidity:62 },
  { id:183, name:'La Rioja Alta Viña Ardanza Reserva', vintage:'2016', region:'Rioja, Spain', grape:'Tempranillo blend', body:74, sweetness:12, tannin:65, acidity:64 },

  // ── Portuguese & Other ─────────────────────────────────────────────
  { id:190, name:'Quinta do Noval Vintage Port', vintage:'2017', region:'Douro, Portugal', grape:'Port blend', body:90, sweetness:88, tannin:70, acidity:50 },
  { id:191, name:'Taylor Fladgate 20 Year Tawny Port', vintage:'NV', region:'Douro, Portugal', grape:'Port blend', body:78, sweetness:80, tannin:50, acidity:54 },
  { id:192, name:'Dr. Loosen Riesling Kabinett', vintage:'2022', region:'Mosel, Germany', grape:'Riesling', body:34, sweetness:55, tannin:3, acidity:82 },
  { id:193, name:'Egon Müller Scharzhofberger Riesling', vintage:'2021', region:'Mosel, Germany', grape:'Riesling', body:38, sweetness:50, tannin:3, acidity:84 },
  { id:194, name:'Yalumba The Signature Cabernet-Shiraz', vintage:'2018', region:'Barossa, Australia', grape:'Cabernet-Shiraz', body:84, sweetness:14, tannin:74, acidity:58 },
  { id:195, name:'Henschke Hill of Grace Shiraz', vintage:'2018', region:'Eden Valley, Australia', grape:'Shiraz', body:90, sweetness:12, tannin:84, acidity:60 },
]

// Combined search index: catalog wines + search-only well-known bottles.
// All entries carry palate axes so the inference engine can derive a profile
// from any rated wine, regardless of whether it's a recommendation candidate.
export const wineSearchDb = [
  ...wines.map(w => ({
    id: w.id, name: w.name, vintage: w.vintage, region: w.region,
    grape: w.grape, price: w.price,
    body: w.body, sweetness: w.sweetness, tannin: w.tannin, acidity: w.acidity,
  })),
  ...extraSearchWines,
]

export const tasteProfiles = [
  {
    id: 'bold-red',
    name: 'The Bold Red Lover',
    description: 'You gravitate toward full-bodied, structured reds with dark fruit and firm tannins.',
    loves: ['Cabernet Sauvignon', 'Malbec', 'Shiraz', 'Zinfandel', 'Red blends'],
    skips: ['Moscato', 'Pinot Grigio', 'Sparkling wine', 'Sweet Riesling'],
    palate: { body: 85, sweetness: 14, tannin: 78, acidity: 55 },
  },
  {
    id: 'elegant-red',
    name: 'The Elegant Red Drinker',
    description: 'You prefer lighter, nuanced reds with earthy complexity and bright acidity.',
    loves: ['Pinot Noir', 'Sangiovese', 'Tempranillo', 'Gamay', 'Burgundy'],
    skips: ['High-tannin Cabernet', 'Sweet wines', 'Heavy red blends'],
    palate: { body: 50, sweetness: 12, tannin: 40, acidity: 72 },
  },
  {
    id: 'rich-white',
    name: 'The Rich White Fan',
    description: 'Creamy, oaked whites with tropical fruit and a long, satisfying finish are your thing.',
    loves: ['Chardonnay', 'White Burgundy', 'Viognier', 'Oaked whites'],
    skips: ['Bone-dry reds', 'High-tannin wines', 'Bitter styles'],
    palate: { body: 65, sweetness: 20, tannin: 6, acidity: 52 },
  },
  {
    id: 'crisp-white',
    name: 'The Crisp White Lover',
    description: 'Bright, zesty whites with high acidity and minerality are your go-to.',
    loves: ['Sauvignon Blanc', 'Pinot Grigio', 'Riesling', 'Albariño', 'Rosé'],
    skips: ['Heavy oaked Chardonnay', 'High-tannin reds', 'Sweet dessert wines'],
    palate: { body: 38, sweetness: 10, tannin: 3, acidity: 80 },
  },
  {
    id: 'sweet-sipper',
    name: 'The Sweet Sipper',
    description: 'You love wines with noticeable sweetness — fruit-forward and easy to enjoy.',
    loves: ['Moscato', 'Sweet Riesling', 'Rosé', 'Sparkling wines', 'Off-dry whites'],
    skips: ['Bone-dry reds', 'High-tannin wines', 'Austere Burgundy'],
    palate: { body: 30, sweetness: 70, tannin: 5, acidity: 58 },
  },
  {
    id: 'crowd-pleaser',
    name: 'The Crowd Pleaser',
    description: 'You love approachable, smooth wines that everyone at the table will enjoy.',
    loves: ['Red blends', 'Merlot', 'Rosé', 'Pinot Noir', 'Soft Chardonnay'],
    skips: ['Tannic structured reds', 'Bone-dry Riesling', 'Challenging natural wines'],
    palate: { body: 60, sweetness: 28, tannin: 45, acidity: 55 },
  },
]

export const quizSteps = [
  {
    id: 'flavorPreferences',
    type: 'pills',
    multi: true,
    required: false,
    title: 'Which flavors do you love?',
    subtitle: 'Pick all that apply',
    options: ['Dark fruits', 'Red berries', 'Citrus & tropical', 'Earthy & herbal', 'Vanilla & oak', 'Floral', 'Spice & pepper'],
  },
  {
    id: 'goToDrink',
    type: 'pills',
    multi: false,
    required: false,
    title: "What's your usual go-to?",
    subtitle: 'Pick one',
    options: ['Red wine', 'White wine', 'Rosé', 'Sparkling', "I don't drink wine often"],
  },
  {
    id: 'boldness',
    type: 'slider',
    required: false,
    title: 'How bold do you like it?',
    subtitle: 'Drag to set your preference',
    labels: ['Light & delicate', 'Big & powerful'],
    defaultValue: 50,
  },
  {
    id: 'sweetness',
    type: 'pills',
    multi: false,
    required: false,
    title: 'How sweet do you like your wine?',
    subtitle: 'Pick one',
    options: ['Bone dry always', 'Dry is fine', 'Slightly sweet is perfect', 'I love sweet'],
  },
  {
    id: 'mealAppeal',
    type: 'pills',
    multi: false,
    required: false,
    title: "What sounds most appealing tonight?",
    subtitle: 'Pick one',
    options: ['Grilled steak or lamb', 'Salmon or seafood', 'Pasta or pizza', 'Cheese and charcuterie', 'Just sipping solo'],
  },
  {
    id: 'wineRatings',
    type: 'wine_ratings',
    required: false,
    title: "Rate wines you've had",
    subtitle: 'Search any bottles you remember and tell us how you felt — your palate updates live.',
  },
]

// Five rating buckets, ordered from most-positive to most-negative signal.
// `weight` drives how strongly the wine pulls the inferred palate toward
// (positive) or away from (negative) its axes. `matchDelta` is applied to
// the match score for that specific wine in the match engine.
export const RATING_BUCKETS = [
  { id: 'loved',    label: 'Loved it',  emoji: '❤️', weight:  2.0, matchDelta:  35 },
  { id: 'liked',    label: 'Liked it',  emoji: '👍', weight:  1.0, matchDelta:  15 },
  { id: 'ok',       label: 'It was OK', emoji: '🤷', weight:  0.0, matchDelta:   0 },
  { id: 'disliked', label: 'Disliked',  emoji: '👎', weight: -1.0, matchDelta: -15 },
  { id: 'hated',    label: 'Hated it',  emoji: '🚫', weight: -2.0, matchDelta: -35 },
]
