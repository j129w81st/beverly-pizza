# Beverly pizza inventory audit — November 8, 2026

27 locations tracked. This is a researched working inventory, not a verified census of every food establishment. Do not inflate the count to a target based on search result counts: directories often include surrounding towns, closed locations, duplicate names, or restaurants with only a kids pizza. Toscana Bar Italiano at 90 Rantoul was additionally confirmed from its official current food menu; its standard pizza diameter and plain topping charge remain unconfirmed.

Newly identified sources: Anchor Pub & Grille (20 Cabot), Mikey’s Famous Roast Beef & Pizza (250 Elliott), Nick’s (207 Essex), North Beverly Roast Beef & Seafood (10 Enon), REV Kitchen & Bar (45 Enon), Salerno’s (73 Cabot), Sidedoor Sally’s (214 Cabot), A&B Burgers (206 Cabot), and The Castle (140 Rantoul). Their website/menu references are in `data.js`. Live Anchor, Mikey’s and REV menus support new automated price collectors.

## Leads still requiring verification

| Lead | Evidence / next step |
| --- | --- |
| Organic Garden / OG Kitchen | Old pizza menu lists vegan cashew-cheese pizza; official domain now redirects. Confirm current Beverly operation and current pizza/size offering before adding. https://www.organicgardencafe.com/ |
| Whole Foods prepared-food pizza | Official Beverly store at 150 Brimbal Avenue; verify pizza counter operation, size and current whole-pie pricing. https://www.wholefoodsmarket.com/stores/beverly |
| Pressed Café | Reported new Beverly location at 900 Cummings Center in 2026; verify official location menu and pizza sizes. https://www.pressedcafe.com/locations |
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
