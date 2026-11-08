# Beverly pizza inventory audit — November 8, 2026

**Current comparison policy:** any cheese pizza size is eligible. Record its explicit diameter in inches when available; otherwise show “Diameter unconfirmed” alongside a verified price. The earlier Large-only exclusions below describe the previous audit policy. Panini’s Small cheese ($12.75), Toscana’s cheese ($17.00), and Pressed Café’s cheese/pepperoni ($16.00/$17.00) now have verified live collectors. Their diameters still need owner/source confirmation. The private admin desk collects these diameter gaps and other uncertain findings for approval.

28 locations tracked. This is a researched working inventory, not a verified census of every food establishment. Do not inflate the count to a target based on search result counts: directories often include surrounding towns, closed locations, duplicate names, or restaurants with only a kids pizza. Toscana Bar Italiano at 90 Rantoul was additionally confirmed from its official current food menu; its standard pizza diameter and plain topping charge remain unconfirmed.

## Additional menu checks

- Nick’s: the official website links to https://www.ediningexpress.com/live40/408/799/ . The rendered Beverly menu explicitly lists Small cheese $10.00 and Large $12.99. Browser collector added; no topping charge inferred and no cart interactions.
- Ellie’s: https://www.elliespizzamenu.com/ exposes Small $9.95, Large $16.99 and Party $36.99 in the cheese item dialog. Selecting Large changes pepperoni from $1.35 to $2.00. Collector selects Large, reads the updated charge and verifies the preview total ($18.99); never adds to cart. An alternate ordersave storefront shows different prices, so it is not used.
- Pressed Café: official ordering site https://pressedcafe.olo.com/menu/pressed-cafe-beverly confirms 900 Cummings Center, Suite 100-U, phone 351-223-8024, and cheese/pepperoni pizzas. Added to inventory. No diameter or Large designation found, including the item options; prices remain excluded from Large comparisons. Opening also confirmed by landlord announcement https://www.cummings.com/press-releases/Pressed-Cafe-Brings-New-Flavors-to-Cummings-Center-Beverly.html .
- OTTO: replaced generic locations link with official Beverly page https://locations.ottoportland.com/otto-74267f9b9f7f and added its phone. Linked ordering site requires security verification in local fetch/browser checks; no unverified prices published.
- Cabot Pizza’s linked ordering menu renders in Chromium, but the listing repeats starting prices without size labels. Requires an item-option collector before pricing can be published.
- Soma’s linked Toast menu is indexed with 16-inch pizza prices, but fresh local requests receive security verification. Search-index prices are not treated as a fresh successful collection.
- Whole Foods Beverly’s official store page currently lists sushi and sandwich counters, without a pizza venue. A generic prepared-foods job mentions pizza; this does not confirm a current whole-pie counter, so it remains a lead.

Newly identified sources: Anchor Pub & Grille (20 Cabot), Mikey’s Famous Roast Beef & Pizza (250 Elliott), Nick’s (207 Essex), North Beverly Roast Beef & Seafood (10 Enon), REV Kitchen & Bar (45 Enon), Salerno’s (73 Cabot), Sidedoor Sally’s (214 Cabot), A&B Burgers (206 Cabot), and The Castle (140 Rantoul). Their website/menu references are in `data.js`. Live Anchor, Mikey’s and REV menus support new automated price collectors.

## Leads still requiring verification

| Lead | Evidence / next step |
| --- | --- |
| Organic Garden / OG Kitchen | Old pizza menu lists vegan cashew-cheese pizza; official domain now redirects. Confirm current Beverly operation and current pizza/size offering before adding. https://www.organicgardencafe.com/ |
| Whole Foods prepared-food pizza | Official Beverly store at 150 Brimbal Avenue; verify pizza counter operation, size and current whole-pie pricing. https://www.wholefoodsmarket.com/stores/beverly |
| Pressed Café | Added after official Beverly ordering-menu verification. Large size remains unconfirmed. https://pressedcafe.olo.com/menu/pressed-cafe-beverly |
| Hale Street Tavern | Older menus list a kids French-bread pizza. Verify current pizza offering; do not treat a kids item as Large. https://www.allmenus.com/ma/beverly/395064-hale-street-tavern-oyster-bar/menu/ |

## Old names and conflicting records

| Lead | Treatment |
| --- | --- |
| Dom’s Pizza, 79 Bridge | Replaced by Tesoro Cucina; do not count twice. https://bostonrestaurants.blogspot.com/2021/12/doms-pizza-and-subs-in-beverly-is.html |
| Amazing Pizza at 273 Cabot | Conflicts with current Maria’s Corner address and reports of relocation to Salem. Not added as a second current Beverly location. |
| Spoleto Pizza / Rantoul St Pizza, 299 Rantoul | Same address and current restaurant’s naming; do not count twice. |
| Bertucci’s, 27 Enon | Legacy address now used by Giuseppe’s; do not count twice. |
| Freeda’s / Upper Crust, 55 Dodge | Historical listings; current operation not verified. |
| Anthony’s Coal Fired Pizza, Brimbal Avenue | Old proposed-opening stories do not prove current operation. Not added. |
| Joe’s Pizza | Conflicting historical/closure listings; confirm current operation/address before adding. |
| Prides Deli, 644 Hale | 2026 municipal-agenda summaries report a recent closure. Marked operation-review, automatic pricing paused, historical observations retained. Confirmation or a reopening source is required before comparing current prices. https://mytown.theboringparts.com/roundup/beverlyma.gov/ |

## Workflow

Nightly collection updates known menu sources. A separate Sunday discovery workflow checks Beverly Main Streets, a pizza directory, and OpenStreetMap food venues within the Beverly city boundary for unfamiliar leads and saves an artifact for review. The first city-boundary query returned 40 food venues, including non-pizza businesses and stale entries; this is not 40 pizza restaurants. OSM attribution is retained in the report. Discovery does not claim completeness or automatically publish unverified leads. The next step toward a complete census is reconciling a current city food-establishment permit list against those sources, then verifying the menu of every additional candidate. No permit-list request or restaurant outreach has been sent.

`/coverage.html` shows price coverage and outstanding work; `/api/coverage.csv` is an audit/export view of the live database. Spreadsheet exports are useful for review, but they do not replace checking restaurant menus. Some restaurants may not offer a comparable large pie at all.
