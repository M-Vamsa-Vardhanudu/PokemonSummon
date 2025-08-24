# Pokemon Summoner

A small full‑stack web app to summon, catch, trade, and market Pokémon with a coin economy, inventory of Poké Balls, a buddy system, and a raid battle playground.

- Frontend: vanilla HTML/CSS/JS ([fetching.html](c:\Users\vamsi\Downloads\pokemon\fetching.html), [styles.css](c:\Users\vamsi\Downloads\pokemon\styles.css), [script.js](c:\Users\vamsi\Downloads\pokemon\script.js))
- Backend: Node.js/Express ([node.js](c:\Users\vamsi\Downloads\pokemon\node.js))
- Extras: Raid UI ([trail.html](c:\Users\vamsi\Downloads\pokemon\trail.html))
- Assets: PokeAPI sprites and images (runtime fetch)

## Features

- Auth: register, login, logout ([`register`](c:\Users\vamsi\Downloads\pokemon\script.js), [`login`](c:\Users\vamsi\Downloads\pokemon\script.js), [`logout`](c:\Users\vamsi\Downloads\pokemon\script.js); server endpoints in [node.js](c:\Users\vamsi\Downloads\pokemon\node.js))
- Coins: server‑backed balance with UI sync ([`loadCoins`](c:\Users\vamsi\Downloads\pokemon\script.js), [`updateCoinsInDB`](c:\Users\vamsi\Downloads\pokemon\script.js), `/api/coins`, `/api/update-coins`)
- Summon & Catch: summon random Pokémon, choose ball, animated catch, coin rewards by rarity ([`getPokemonImage`](c:\Users\vamsi\Downloads\pokemon\script.js), [`addCatchContainer`](c:\Users\vamsi\Downloads\pokemon\script.js), [`selectPokeball`](c:\Users\vamsi\Downloads\pokemon\script.js), [`attemptCatch`](c:\Users\vamsi\Downloads\pokemon\script.js), [`awardCoinsForCatch`](c:\Users\vamsi\Downloads\pokemon\script.js))
- Inventory: server‑synced Poké Ball counts + shop to buy balls ([`loadPokeballsFromDB`](c:\Users\vamsi\Downloads\pokemon\script.js), shop UI in [fetching.html](c:\Users\vamsi\Downloads\pokemon\fetching.html))
- Collection: load saved Pokémon, sort by ID/Name/Rarity ([`loadSavedPokemon`](c:\Users\vamsi\Downloads\pokemon\script.js), [`sortPokemon`](c:\Users\vamsi\Downloads\pokemon\script.js), [`createPokemonCardFromDB`](c:\Users\vamsi\Downloads\pokemon\script.js))
- Market: list market Pokémon, buy with coins ([`loadMarketPokemon`](c:\Users\vamsi\Downloads\pokemon\script.js), `/api/market-pokemon`, `/api/buy-pokemon/:id`)
- Trading: offer/accept/reject trades ([`openTradeModal`](c:\Users\vamsi\Downloads\pokemon\script.js), [`acceptTrade`](c:\Users\vamsi\Downloads\pokemon\script.js), [`rejectTrade`](c:\Users\vamsi\Downloads\pokemon\script.js), [`setupTradeButtonListeners`](c:\Users\vamsi\Downloads\pokemon\script.js))
- Buddy: choose a buddy and persist it ([`Buddy`](c:\Users\vamsi\Downloads\pokemon\script.js), [`updatebuddyinDB`](c:\Users\vamsi\Downloads\pokemon\script.js), `/api/buddy`, `/api/update-buddy`)
- Raids: separate battle playground with entry fees and refund logic ([trail.html](c:\Users\vamsi\Downloads\pokemon\trail.html); launcher injected by [`injectRaidLauncher`](c:\Users\vamsi\Downloads\pokemon\script.js))

## Project structure

- [fetching.html](c:\Users\vamsi\Downloads\pokemon\fetching.html) — main UI (auth, summon, inventory, shop, collection, market, trade)
- [styles.css](c:\Users\vamsi\Downloads\pokemon\styles.css) — app styles (cards, buttons, catch UI, trade UI)
- [script.js](c:\Users\vamsi\Downloads\pokemon\script.js) — client logic, API calls, DOM updates, animations
- [trail.html](c:\Users\vamsi\Downloads\pokemon\trail.html) — raid battle UI
- [node.js](c:\Users\vamsi\Downloads\pokemon\node.js) — Express server, MongoDB access, session/auth routes

## Getting started

Prerequisites:
- Node.js LTS
- MongoDB running and reachable
- Internet access (PokeAPI images)

Environment:
- Configure your MongoDB connection string and session secret as env vars.
  - Windows (PowerShell):
    - $env:MONGODB_URI="mongodb://localhost:27017/pokemon"
    - $env:SESSION_SECRET="change-me"
  - Windows (CMD):
    - set MONGODB_URI=mongodb://localhost:27017/pokemon
    - set SESSION_SECRET=change-me

Install and run:
- npm install
- node node.js
- Open the app in your browser (server logs show the port). Main page is [fetching.html](c:\Users\vamsi\Downloads\pokemon\fetching.html).

## Key flows

- Auth:
  - UI: forms in [fetching.html](c:\Users\vamsi\Downloads\pokemon\fetching.html)
  - Client: [`checkAuth`](c:\Users\vamsi\Downloads\pokemon\script.js), [`register`](c:\Users\vamsi\Downloads\pokemon\script.js), [`login`](c:\Users\vamsi\Downloads\pokemon\script.js), [`logout`](c:\Users\vamsi\Downloads\pokemon\script.js)
  - Server: /api/register, /api/login, /api/logout

- Coins:
  - Load on startup via [`loadCoins`](c:\Users\vamsi\Downloads\pokemon\script.js) → `/api/coins`
  - Persist updates via [`updateCoinsInDB`](c:\Users\vamsi\Downloads\pokemon\script.js) → `/api/update-coins`
  - Display updated by [`updateCoinsDisplay`](c:\Users\vamsi\Downloads\pokemon\script.js)

- Summon & catch:
  - Summon button triggers [`getPokemonImage`](c:\Users\vamsi\Downloads\pokemon\script.js)
  - Catch UI injected by [`addCatchContainer`](c:\Users\vamsi\Downloads\pokemon\script.js)
  - Select ball via [`selectPokeball`](c:\Users\vamsi\Downloads\pokemon\script.js); throw with [`attemptCatch`](c:\Users\vamsi\Downloads\pokemon\script.js)
  - On success: save via [`savePokemonToDB`](c:\Users\vamsi\Downloads\pokemon\script.js); award coins via [`awardCoinsForCatch`](c:\Users\vamsi\Downloads\pokemon\script.js)

- Collection & sorting:
  - Load via [`loadSavedPokemon`](c:\Users\vamsi\Downloads\pokemon\script.js) → `/api/get-pokemon`
  - Cards built by [`createPokemonCardFromDB`](c:\Users\vamsi\Downloads\pokemon\script.js)
  - Sort with [`sortPokemon`](c:\Users\vamsi\Downloads\pokemon\script.js) (id | name | rarity)

- Market:
  - Load via [`loadMarketPokemon`](c:\Users\vamsi\Downloads\pokemon\script.js) → `/api/market-pokemon`
  - Buy flow uses `/api/buy-pokemon/:pokemonId` and updates coins/UI

- Trading:
  - Accept/reject endpoints: `/api/trade-accept/:id`, `/api/trade-reject/:id`
  - Client helpers: [`acceptTrade`](c:\Users\vamsi\Downloads\pokemon\script.js), [`rejectTrade`](c:\Users\vamsi\Downloads\pokemon\script.js), [`setupTradeButtonListeners`](c:\Users\vamsi\Downloads\pokemon\script.js)

- Poké Ball inventory & shop:
  - Load inventory via [`loadPokeballsFromDB`](c:\Users\vamsi\Downloads\pokemon\script.js) → `/api/pokeballs`
  - Shop UI in [fetching.html](c:\Users\vamsi\Downloads\pokemon\fetching.html); client updates coin balance and inventory

- Buddy:
  - Get/set via `/api/buddy` and `/api/update-buddy`
  - Client: [`Buddy`](c:\Users\vamsi\Downloads\pokemon\script.js), [`loadbuddy`](c:\Users\vamsi\Downloads\pokemon\script.js), [`updatebuddyinDB`](c:\Users\vamsi\Downloads\pokemon\script.js)

- Raids:
  - Open from injected launcher ([`injectRaidLauncher`](c:\Users\vamsi\Downloads\pokemon\script.js)) to [trail.html](c:\Users\vamsi\Downloads\pokemon\trail.html#L1)
  - Entry fees and refunds handled client‑side in [trail.html](c:\Users\vamsi\Downloads\pokemon\trail.html)

## Styling and UX

- Responsive card UI and “Throw Ball” button with effects ([styles.css](c:\Users\vamsi\Downloads\pokemon\styles.css); see `.catch-button`, `.pokemon-card`)
- Animated card tilt initialized by [`initCardTiltEffect`](c:\Users\vamsi\Downloads\pokemon\script.js)

## Notes and tips

- Requires a working session on the server for auth‑protected endpoints like `/api/coins` (see [`requireAuth`](c:\Users\vamsi\Downloads\pokemon\node.js) usage).
- Sprites loaded from PokeAPI; network is required for images.
- Sorting by rarity depends on mapping helpers in [`sortPokemon`](c:\Users\vamsi\Downloads\pokemon\script.js).

## Known issues/TODO

- In [`loadbuddy`](c:\Users\vamsi\Downloads\pokemon\script.js) the call `updatebuddyinDB(Buddy)` likely should pass the buddy value, not the function.
- Ensure all endpoints return JSON consistently; some error paths may return HTML/text.
- Verify default coin value handling in [`loadCoins`](c:\Users\vamsi\Downloads\pokemon\script.js).

## License

Personal/educational use. Replace