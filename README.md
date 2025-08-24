# Pokémon Summoner

A small full-stack web app to summon, catch, trade, and market Pokémon with a coin economy, inventory of Poké Balls, a buddy system, and a raid battle playground.

---

## Features

- **Auth**: register, login, logout  
- **Coins**: server-backed balance with UI sync  
- **Summon & Catch**: summon random Pokémon, choose ball, animated catch, coin rewards by rarity  
- **Inventory**: server-synced Poké Ball counts + shop to buy balls  
- **Collection**: load saved Pokémon, sort by ID/Name/Rarity  
- **Market**: list Pokémon, buy with coins  
- **Trading**: offer/accept/reject trades  
- **Buddy**: choose a buddy and persist it  
- **Raids**: battle playground with entry fees and refund logic  

---

## Tech Stack

- **Frontend**: vanilla HTML/CSS/JS  
- **Backend**: Node.js + Express  
- **Database**: MongoDB (Atlas)  
- **Assets**: PokeAPI sprites and images (fetched at runtime)  

---

## Project Structure

- [`fetching.html`](fetching.html) — main UI (auth, summon, inventory, shop, collection, market, trade)  
- [`styles.css`](styles.css) — app styles (cards, buttons, catch UI, trade UI)  
- [`script.js`](script.js) — client logic, API calls, DOM updates, animations  
- [`trail.html`](trail.html) — raid battle UI  
- [`node.js`](node.js) — Express server, MongoDB access, session/auth routes  

---

## Getting Started

### Prerequisites
- [Node.js LTS](https://nodejs.org/)  
- [MongoDB](https://www.mongodb.com/) running locally or Atlas cluster  
- Internet access (for PokeAPI images)

### Clone the repository
```bash
git clone https://github.com/M-Vamsa-Vardhanudu/PokemonSummon.git
cd PokemonSummon

```

## Screenshots

### Summon Pokémon
![Summon](assets/screenshots/Screenshot%20(309).png)

### Market
![Market](assets/screenshots/Screenshot%20(310).png)

### Raid Battle
![Raid](assets/screenshots/Screenshot%20(315).png)

### Collection
![Collection](assets/screenshots/Screenshot%20(316).png)

