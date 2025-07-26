// Global variables for pokeballs and currently summoned pokemon
let selectedPokeball = null;
let currentPokemon = null;
let pokeballInventory = {
    pokeball: 10,
    greatball: 5,
    ultraball: 3,
    masterball: 1
};

// Global variable for user coins
// let userCoins = 500; // Starting amount

// let loadCoins = loadCoins();

async function loadCoins() {
    try {
        const response = await fetch('/api/coins');
        if (!response.ok) {
            throw new Error(`Failed to fetch coins: ${response.statusText}`);
        }

        const data = await response.json();
        userCoins = data.coins || 0; // Update the global `userCoins` variable
        updateCoinsDisplay(); // Update the UI with the fetched coins
    } catch (error) {
        console.error('Error loading coins:', error);
        userCoins = -100; // Default to 0 coins if the request fails
        updateCoinsDisplay();
    }
}

async function updateCoinsInDB(newCoins) {
    console.log('Updating coins in DB:', newCoins);
    try {
        const response = await fetch('/api/update-coins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coins: newCoins }),
            
            credentials: 'include' // Include credentials for session management
        });

        const data = await response.json();
        if (!data.success) {
            console.error('Failed to update coins in DB:', data.message);
        }
    } catch (error) {
        console.error('Error updating coins in DB:', error);
    }
}

function buyPokeball(ballType, price) {
    
    if (userCoins >= price) {
        // Deduct coins
        userCoins -= price;
        updateCoinsDisplay();
        updateCoinsInDB(userCoins); // Save the updated coins value in MongoDB

        // Add to inventory
        pokeballInventory[ballType]++;
        updateBallCounts();

        // Show success message
        showNotification(`Successfully purchased 1 ${formatBallName(ballType)}!`, 'success');
    } else {
        // Show insufficient funds message
        showNotification(`Not enough coins! You need ${price - userCoins} more coins.`, 'error');
    }
}



// Define Pokemon rarity tiers
const legendaryPokemon = [
  144, 145, 146, 150, // Kanto birds + Mewtwo
  243, 244, 245,      // Johto beasts
  249, 250,           // Lugia, Ho-Oh
  377, 378, 379,      // Regi trio
  380, 381,           // Latias, Latios
  382, 383, 384,      // Kyogre, Groudon, Rayquaza
  480, 481, 482,      // Lake trio
  483, 484, 485, 486, // Dialga, Palkia, Heatran, Regigigas
  487, 488,           // Giratina, Cresselia
  638, 639, 640,      // Cobalion trio
  641, 642, 645,      // Tornadus, Thundurus, Landorus
  643, 644, 646,      // Reshiram, Zekrom, Kyurem
  716, 717, 718,      // Xerneas, Yveltal, Zygarde
  785, 786, 787, 788, // Tapu guardians
  891, 892, 894, 895, 896, 897, // Kubfu, Urshifu, Regieleki, Regidrago, Glastrier, Spectrier
  898                 // Calyrex
];

const mythicalPokemon = [
  151, // Mew
  251, // Celebi
  385, // Jirachi
  386, // Deoxys
  489, 490, // Phione, Manaphy
  491, 492, 493, // Darkrai, Shaymin, Arceus
  494, // Victini
  647, 648, 649, // Keldeo, Meloetta, Genesect
  719, // Diancie
  720, // Hoopa
  721, // Volcanion
  801, // Magearna
  802, // Marshadow
  807, // Zeraora
  808, 809, // Meltan, Melmetal
  893, // Zarude
  1005, 1006, 1007, 1008, // Paradox forms (some may be considered mythical depending on lore)
  1009, 1010            // Terapagos, etc. (recent additions)
];

const ultraBeasts = [
  793, 794, 795, 796, 797, 798, 799, 800, // Nihilego to Necrozma
  803, 804, 805, 806,                     // Poipole to Blacephalon
  891, 892                               // Kubfu, Urshifu (sometimes debated, but mostly not UB)
];

const rarePokemon = [
  149, // Dragonite
  248, // Tyranitar
  373, // Salamence
  376, // Metagross
  445, // Garchomp
  635, // Hydreigon
  706, // Goodra
  784, // Kommo-o
  887  // Dragapult
];

const captureRates = {
    common: {
        pokeball: 0.5,    // 50% chance
        greatball: 0.65,  // 65% chance
        ultraball: 0.8,   // 80% chance
        masterball: 1.0   // 100% chance
    },
    rare: {
        pokeball: 0.25,   // 25% chance
        greatball: 0.45,  // 45% chance
        ultraball: 0.65,  // 65% chance
        masterball: 1.0   // 100% chance
    },
    legendary: {
        pokeball: 0.08,   // 8% chance
        greatball: 0.18,  // 18% chance
        ultraball: 0.3,   // 30% chance
        masterball: 1.0   // 100% chance
    },
    mythical: {
        pokeball: 0.05,   // 5% chance
        greatball: 0.12,  // 12% chance
        ultraball: 0.25,  // 25% chance
        masterball: 1.0   // 100% chance
    },
    'ultra-beast': {
        pokeball: 0.05,   // 5% chance
        greatball: 0.15,  // 15% chance
        ultraball: 0.3,   // 30% chance
        masterball: 1.0   // 100% chance
    }
};




// Function to determine Pokemon rarity
function getPokemonRarity(id) {
    if (mythicalPokemon.includes(id)) return 'mythical';
    if (legendaryPokemon.includes(id)) return 'legendary';
    if (ultraBeasts.includes(id)) return 'ultra-beast';
    if (rarePokemon.includes(id)) return 'rare';
    return 'common';
}

// Function to get rarity value for sorting (higher number = more rare)
function getRarityValue(rarity) {
    switch(rarity) {
        case 'mythical': return 5;
        case 'legendary': return 4;
        case 'ultra-beast': return 3;
        case 'rare': return 2;
        default: return 1;
    }
}
async function openTradeModal() {
    await loadSavedPokemon();
    const loadedPokemon = document.querySelectorAll('.pokemon-card');
    return new Promise(resolve => {
        loadedPokemon.forEach(card => {
            card.addEventListener("click", () => {
                const nameElement = card.querySelector('.pokemon-name');
                if (nameElement) {
                    const modal = document.getElementById('tradeConfirmModal');
                    const text = document.getElementById('tradeConfirmText');
                    text.textContent = `Do you want to trade ${nameElement.textContent}?`;
                    console.log(card);
                    modal.classList.remove('hidden');
                    setTimeout(() => {
                        modal.classList.add('active');
                    }, 10);

                    const confirmBtn = document.getElementById('confirmTradeBtn');
                    const cancelBtn = document.getElementById('cancelTradeBtn');
                    confirmBtn.onclick = null;
                    cancelBtn.onclick = null;

                    confirmBtn.onclick = () => {
                        modal.classList.remove('active');
                        setTimeout(() => modal.classList.add('hidden'), 300);
                        resolve(nameElement.textContent);
                        console.log(card);
                        tradePokemon(card);
                    };
                    cancelBtn.onclick = () => {
                        modal.classList.remove('active');
                        setTimeout(() => modal.classList.add('hidden'), 300);
                    };
                }
            });
        });
    });
}

const tradePokemon = async (pokemonCard) => {
    const pokemon = pokemonCard;
    const idelm = pokemonCard.querySelector('.pokemon-id');
    let idText = null;
    if ( !idelm){
        console.log("No pokemon id found in card" + pokemonCard + " " + pokemon);
        return;
    }
    else {
        idText = idelm.textContent; // ← this is "#080"
        idText = idText.replace("#" , "");
        console.log('Pokemon ID:', idText );

        console.log(`/api/trade-pokemon/${idText}`);

    }
    const response = await fetch(`/api/trade-pokemon/${idText}`, {
        method: 'DELETE'
    });

    const result = await response.json();
    if ( result.success ){
        pokemon.style.animation = 'fadeOut 0.5s';

        setTimeout(()=>{
            pokemon.remove();
        } , 500);
    }
    else{
        console.log("error trading pokemon");
    }
}

async function openMarketModal(){
    try {
        const sortfunction = document.getElementsByClassName('sort-controls')[0];
        sortfunction.style.visibility = 'visible'; // Hide sort function when viewing collection
        const response = await fetch('/api/get-pokemon');
        const savedPokemon = await response.json();
        
        const container = document.getElementById('pokemonContainer');
        container.innerHTML = ''; // Clear existing content
        
        savedPokemon.forEach(pokemon => {
            const pokemonCard = createPokemonCardFromDB(pokemon);
            container.appendChild(pokemonCard);
        });
        
        console.log(`Loaded ${savedPokemon.length} Pokemon from database`);
        
        // Remove any catch container when viewing collection
        const existingCatchContainer = document.querySelector('.catch-container');
        if (existingCatchContainer) {
            existingCatchContainer.remove();
        }
        
        sortPokemon('id'); 
    } catch (error) {
        console.error('Error loading saved Pokemon:', error);
    }
    
    // Get fresh references after cloning
    const freshLoadedPokemon = document.querySelectorAll('.pokemon-card');
    
    freshLoadedPokemon.forEach(card => {
        card.addEventListener("click", () => {
            const nameElement = card.querySelector('.pokemon-name');
            if (nameElement) {
                const modal = document.getElementById('marketConfirmModal');
                const text = document.getElementById('marketConfirmText');
                text.textContent = `Do you want to put ${nameElement.textContent} to market?`;
                modal.classList.remove('hidden');
                setTimeout(() => {
                    modal.classList.add('active');
                }, 10);

                const confirmBtn = document.getElementById('confirmMarketBtn');
                const cancelBtn = document.getElementById('cancelMarketBtn'); // Updated selector
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;

                confirmBtn.onclick = async () => {
                    await putPokemonInMarket(card);
                    modal.classList.remove('active');
                    setTimeout(() => modal.classList.add('hidden'), 300);
                };
                
                cancelBtn.onclick = () => {
                    modal.classList.remove('active');
                    setTimeout(() => modal.classList.add('hidden'), 300);
                };
            }
        });
    });
}
const putPokemonInMarket = async (pokemonCard) => {
    const pokemon = pokemonCard;
    const idelm = pokemonCard.querySelector('.pokemon-id');
    let idText = null;
    if (!idelm) {
        console.log("No pokemon id found in card", pokemonCard);
        return;
    }
    else {
        idText = idelm.textContent; // ← this is "#080"
        idText = idText.replace("#", "");
        console.log('Pokemon ID:', idText);
        console.log(`Sending request to: /api/market-pokemon/${idText}`);
    }
    
    try {
        const response = await fetch(`/api/market-pokemon/${idText}`, {
            method: 'PUT'
        });

        console.log("Response status:", response.status);
        const result = await response.json();
        console.log("API response:", result);
        
        if (result.success) {
            console.log("Successfully put Pokemon in market");
            pokemon.style.animation = 'fadeOut 0.5s';

            setTimeout(() => {
                pokemon.remove();
            }, 500);
        }
        else {
            console.error("Error putting Pokemon in market:", result.message || "Unknown error");
        }
    } catch (error) {
        console.error("Exception occurred while putting Pokemon in market:", error);
    }
}

const getPokemonImage = async () => {
    const loading = document.getElementById('loading');
    const container = document.getElementById('pokemonContainer');
    const summonBtn = document.getElementById('summonBtn');
    
    // Clear any existing catch container
    const existingCatchContainer = document.querySelector('.catch-container');
    if (existingCatchContainer) {
        existingCatchContainer.remove();
    }
    
    // Show loading state
    loading.classList.remove('hidden');
    summonBtn.disabled = true;
    
    try {
        const roll = Math.random() * 100;
        let i;
        
        if (roll < 0.1) {
            const idx = ultraBeasts[Math.floor(Math.random() * ultraBeasts.length)];
            i = idx;
        } else if (roll < 0.15) {
            const idx = mythicalPokemon[Math.floor(Math.random() * mythicalPokemon.length)];
            i = idx;
        } else if (roll < 0.16) {
            const idx = legendaryPokemon[Math.floor(Math.random() * legendaryPokemon.length)];
            i = idx;
        } else {
            do {
                i = Math.floor(Math.random() * 1000) + 1;
            } while (
                legendaryPokemon.includes(i) || 
                mythicalPokemon.includes(i) || 
                ultraBeasts.includes(i)
            );
        }
        // Fetch Pokemon data from PokeAPI
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${i}`);
        const pokemonData = await response.json();
        
        // Extract the data you want to store
        const pokemonInfo = {
            pokemonName: pokemonData.name,
            pokemonImage: pokemonData.sprites.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i}.png`,
            pokemonId: pokemonData.id,
            pokemonTypes: pokemonData.types.map(type => type.type.name)
        };
        
        // Store current Pokemon globally
        currentPokemon = pokemonInfo;
        
        // Create Pokemon card with proper rarity
        const pokemonCard = document.createElement('div');
        pokemonCard.className = 'pokemon-card';
        pokemonCard.id = 'current-pokemon';
        
        // Set data-id attribute for sorting
        pokemonCard.dataset.id = pokemonInfo.pokemonId;
        
        // Add rarity styling
        const rarity = getPokemonRarity(pokemonInfo.pokemonId);
        currentPokemon.rarity = rarity;
        
        // Add tooltip for rarity information
        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${rarity}`;
        tooltip.textContent = `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Pokémon`;
        pokemonCard.appendChild(tooltip);
        
        if (rarity !== 'common') {
            pokemonCard.classList.add(`rarity-${rarity}`);
            
            // Add rarity badge
            const rarityBadge = document.createElement('span');
            rarityBadge.classList.add('rarity-badge', `rarity-${rarity}-badge`);
            rarityBadge.textContent = rarity.charAt(0).toUpperCase() + rarity.slice(1);
            pokemonCard.appendChild(rarityBadge);
        }
        
        const img = document.createElement('img');
        img.src = pokemonInfo.pokemonImage;
        img.alt = pokemonInfo.pokemonName;
        img.className = 'pokemon-image';
        
        const name = document.createElement('h3');
        name.textContent = pokemonInfo.pokemonName.charAt(0).toUpperCase() + pokemonInfo.pokemonName.slice(1);
        name.className = 'pokemon-name';
        
        const id = document.createElement('p');
        id.textContent = `#${pokemonInfo.pokemonId.toString().padStart(3, '0')}`;
        id.className = 'pokemon-id';
        
        const types = document.createElement('div');
        types.className = 'pokemon-types';
        pokemonInfo.pokemonTypes.forEach(typeName => {
            const typeSpan = document.createElement('span');
            typeSpan.textContent = typeName;
            typeSpan.className = `type type-${typeName}`;
            types.appendChild(typeSpan);
        });
        
        pokemonCard.appendChild(img);
        pokemonCard.appendChild(name);
        pokemonCard.appendChild(id);
        pokemonCard.appendChild(types);
        
        // Clear previous Pokemon and add new one
        container.innerHTML = '';
        container.appendChild(pokemonCard);
        
        // Add catch container
        addCatchContainer(container);
        
        // Add animation
        pokemonCard.style.animation = 'slideIn 0.5s ease-out';
        
    } catch (error) {
        console.error('Error fetching Pokemon:', error);
        // Fallback to original method
        const img = document.createElement('img');
        let i = Math.floor(Math.random() * 1025) + 1;
        img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i}.png`;
        img.alt = `Pokemon ${i}`;
        img.className = 'pokemon-image';
        container.innerHTML = '';
        container.appendChild(img);
    } finally {
        // Hide loading state
        loading.classList.add('hidden');
        summonBtn.disabled = false;
    }

}
// Function to create a Pokemon card from database data
function createPokemonCardFromDB(pokemon) {
    // Debug log to see what we're getting from the database
    console.log("Pokemon data from DB:", pokemon);
    
    // Create Pokemon card
    const pokemonCard = document.createElement('div');
    pokemonCard.className = 'pokemon-card';
    
    // Handle different possible data structures
    // Some APIs return data in a nested format or with different property names
    
    // If pokemon has a nested 'pokemon' or 'data' property, use that instead
    if (pokemon.pokemon) {
        pokemon = pokemon.pokemon;
    } else if (pokemon.data) {
        pokemon = pokemon.data;
    }
    
    // Set data-id attribute for sorting
    // Check for both pokemonId and id formats
    const pokemonId = pokemon.pokemonId || pokemon.id || 0;
    pokemonCard.dataset.id = pokemonId;
    
    // Determine rarity if not provided
    const rarity = pokemon.rarity || getPokemonRarity(pokemonId);
    
    // Add rarity styling
    if (rarity && rarity !== 'common') {
        pokemonCard.classList.add(`rarity-${rarity}`);
        
        // Add rarity badge
        const rarityBadge = document.createElement('span');
        rarityBadge.classList.add('rarity-badge', `rarity-${rarity}-badge`);
        rarityBadge.textContent = rarity.charAt(0).toUpperCase() + rarity.slice(1);
        pokemonCard.appendChild(rarityBadge);
        
        // Add tooltip for rarity information
        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${rarity}`;
        tooltip.textContent = `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Pokémon`;
        pokemonCard.appendChild(tooltip);
    }
    
    // Check for different image property names
    const imageUrl = pokemon.pokemonImage || pokemon.image || pokemon.sprite || 
                    (pokemon.sprites && pokemon.sprites.front_default) || 
                    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = pokemon.pokemonName || pokemon.name || 'Unknown Pokemon';
    img.className = 'pokemon-image';
    
    const name = document.createElement('h3');
    // Get name from different possible properties
    const pokemonName = pokemon.pokemonName || pokemon.name;
    name.textContent = pokemonName ? 
        (pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1)) : 
        'Unknown Pokemon';
    name.className = 'pokemon-name';
    
    const id = document.createElement('p');
    id.textContent = pokemonId ? 
        `#${pokemonId.toString().padStart(3, '0')}` : 
        '#???';
    id.className = 'pokemon-id';
    
    const types = document.createElement('div');
    types.className = 'pokemon-types';
    
    // Check for different ways types might be stored
    const pokemonTypes = pokemon.pokemonTypes || pokemon.types;
    
    if (pokemonTypes) {
        // Handle two possible formats: array of strings or array of objects
        let typeArray = [];
        
        if (Array.isArray(pokemonTypes)) {
            if (typeof pokemonTypes[0] === 'string') {
                // Format: ["fire", "flying"]
                typeArray = pokemonTypes;
            } else if (pokemonTypes[0] && pokemonTypes[0].type) {
                // Format: [{type: {name: "fire"}}, {type: {name: "flying"}}]
                typeArray = pokemonTypes.map(t => t.type.name);
            } else if (pokemonTypes[0] && pokemonTypes[0].name) {
                // Format: [{name: "fire"}, {name: "flying"}]
                typeArray = pokemonTypes.map(t => t.name);
            }
        }
        
        typeArray.forEach(typeName => {
            const typeSpan = document.createElement('span');
            typeSpan.textContent = typeName;
            typeSpan.className = `type type-${typeName}`;
            types.appendChild(typeSpan);
        });
    }
    
    // If no types were added, add unknown type
    if (types.children.length === 0) {
        const typeSpan = document.createElement('span');
        typeSpan.textContent = 'unknown';
        typeSpan.className = 'type type-unknown';
        types.appendChild(typeSpan);
    }
    
    pokemonCard.appendChild(img);
    pokemonCard.appendChild(name);
    pokemonCard.appendChild(id);
    pokemonCard.appendChild(types);
    
    return pokemonCard;
}

// Function to create and add catch container
function addCatchContainer(parentElement) {
    const catchContainer = document.createElement('div');
    catchContainer.className = 'catch-container';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Select a Poké Ball to catch this Pokémon!';
    instructions.style.color = 'white';
    instructions.style.marginBottom = '10px';
    
    const catchButton = document.createElement('button');
    catchButton.className = 'catch-button';
    catchButton.textContent = 'Throw Ball';
    catchButton.disabled = true;
    catchButton.onclick = attemptCatch;
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'catch-result';
    resultDiv.id = 'catch-result';
    
    catchContainer.appendChild(instructions);
    catchContainer.appendChild(catchButton);
    catchContainer.appendChild(resultDiv);
    
    parentElement.after(catchContainer);
}

// Function to select a Pokeball
function selectPokeball(ballType) {
    // First check if we have any of this ball type
    if (pokeballInventory[ballType] <= 0) {
        alert(`You don't have any ${formatBallName(ballType)} left!`);
        return;
    }
    
    // Remove selected class from all pokeballs
    document.querySelectorAll('.pokeball-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add selected class to clicked pokeball
    document.querySelector(`.pokeball-item[onclick="selectPokeball('${ballType}')"]`).classList.add('selected');
    
    // Store selected pokeball
    selectedPokeball = ballType;
    
    // Enable catch button
    const catchButton = document.querySelector('.catch-button');
    if (catchButton) {
        catchButton.disabled = false;
    }
}

// Function to format ball name for display
function formatBallName(ballType) {
    switch(ballType) {
        case 'pokeball': return 'Poké Ball';
        case 'greatball': return 'Great Ball';
        case 'ultraball': return 'Ultra Ball';
        case 'masterball': return 'Master Ball';
        default: return ballType;
    }
}

// Function to attempt catching the Pokemon
function attemptCatch() {
    if (!currentPokemon || !selectedPokeball) {
        return;
    }
    
    // Decrease ball count
    pokeballInventory[selectedPokeball]--;
    updateBallCounts();
    
    // Disable button during animation
    const catchButton = document.querySelector('.catch-button');
    catchButton.disabled = true;
    
    // Show catch animation
    showCatchAnimation(selectedPokeball);
    
    // Get capture probability based on Pokemon rarity and ball type
    const rarity = currentPokemon.rarity;
    const captureChance = captureRates[rarity][selectedPokeball];
    
    // Generate a fresh random number between 0 and 1 for this specific throw
    const roll = Math.random();
    console.log(`Throw attempt with ${selectedPokeball}: Chance=${captureChance}, Roll=${roll}`);
    
    // Success if roll is less than capture chance
    const success = roll < captureChance;
    
    // Wait for animation to complete before showing result
    setTimeout(() => {
        if (success) {
            catchSuccess();
        } else {
            catchFailure();
            
            selectedPokeball = null;
            
            // Remove selected class from all pokeballs
            document.querySelectorAll('.pokeball-item').forEach(item => {
                item.classList.remove('selected');
            });
        }
        
        // Re-enable button after catch attempt, but it will be disabled until a ball is selected again
        catchButton.disabled = selectedPokeball === null;
    }, 3000);
}

// Function to show catch animation
function showCatchAnimation(ballType) {
    // Create animation container if it doesn't exist
    let animContainer = document.querySelector('.catch-animation');
    if (!animContainer) {
        animContainer = document.createElement('div');
        animContainer.className = 'catch-animation';
        document.body.appendChild(animContainer);
    }
    
    // Add ball image
    const ballImg = document.createElement('img');
    ballImg.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${ballType.replace('ball', '-ball')}.png`;
    animContainer.innerHTML = '';
    animContainer.appendChild(ballImg);
    
    // Activate animation
    animContainer.classList.add('active');
    
    // Remove animation after it completes
    setTimeout(() => {
        animContainer.classList.remove('active');
    }, 3000);
}

// Update the existing savePokemonToDB function to include rarity
const savePokemonToDB = async (pokemonInfo) => {
    try {
        const response = await fetch('/api/save-pokemon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pokemonName: pokemonInfo.pokemonName,
                pokemonImage: pokemonInfo.pokemonImage,
                pokemonId: pokemonInfo.pokemonId,
                pokemonTypes: pokemonInfo.pokemonTypes,
                rarity: pokemonInfo.rarity // Include rarity
            })
        });
        // getting coins is already implemented 
        
        const result = await response.json();
        
        if (result.success) {
            console.log(`Pokemon ${pokemonInfo.pokemonName} saved to database!`);
        } else {
            console.error('Failed to save Pokemon:', result.error);
        }
        
    } catch (error) {
        console.error('Error saving Pokemon to DB:', error);
    }
}

// Check if user is logged in on page load
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        if (data.loggedIn) {
            showGameInterface(data.username);
        } else {
            showAuthInterface();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showAuthInterface();
    }
}

function showAuthInterface() {
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('gameContainer').style.display = 'none';
}

function showGameInterface(username) {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    document.getElementById('currentUser').textContent = username;
    const userInfo = document.getElementById('userInfo');
    userInfo.style.display = 'block';
    setTimeout(() => {
        userInfo.style.display = 'none';
    }, 3000); // Hide user info after 3 seconds
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

async function register() {
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Registration successful! Please login.');
            showLogin();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Registration failed:', error);
        alert('Registration failed');
    }
}

async function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showGameInterface(data.username);
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed');
    }
}

async function logout() {
    try {
        const response = await fetch('/api/logout', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            showAuthInterface();
            // Clear any displayed Pokemon
            document.getElementById('pokemonContainer').innerHTML = '';
        }
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Function to sort Pokemon
function sortPokemon(sortBy) {
    const container = document.querySelector('.pokemon-container');
    if (!container) return;
    
    const pokemonCards = Array.from(container.getElementsByClassName('pokemon-card'));
    
    pokemonCards.sort((a, b) => {
        if (sortBy === 'name') {
            const nameA = a.querySelector('.pokemon-name').textContent.toLowerCase();
            const nameB = b.querySelector('.pokemon-name').textContent.toLowerCase();
            return nameA.localeCompare(nameB);
        } 
        else if (sortBy === 'rarity') {
            const idA = parseInt(a.dataset.id);
            const idB = parseInt(b.dataset.id);
            const rarityA = getPokemonRarity(idA);
            const rarityB = getPokemonRarity(idB);
            return getRarityValue(rarityB) - getRarityValue(rarityA);
        }
        else { // Default: sort by ID
            const idA = parseInt(a.dataset.id);
            const idB = parseInt(b.dataset.id);
            return idA - idB;
        }
    });
    
    // Re-append sorted elements
    pokemonCards.forEach(card => {
        container.appendChild(card);
    });
}

function togglePokemonDisplay() {
    const pokemonContainer = document.getElementById('pokemonContainer');
    const toggleBtn = document.getElementById('toggleDisplayBtn');
    
    if (pokemonContainer.style.display === 'none') {
        pokemonContainer.style.display = 'grid';  // or 'flex' depending on your CSS
        toggleBtn.textContent = 'Hide Pokemon';
    } else {
        pokemonContainer.style.display = 'none';
        toggleBtn.textContent = 'Show Pokemon';
    }
}

const loadMarketPokemon = async () => {
    try {
        const sortfunction = document.getElementsByClassName('sort-controls')[0];
        sortfunction.style.visibility = 'visible'; // Hide sort function when viewing collection
        const response = await fetch('/api/market-pokemon');
        const savedPokemon = await response.json();
        
        const container = document.getElementById('pokemonContainer');
        container.innerHTML = ''; // Clear existing content
        
        savedPokemon.forEach(pokemon => {
            const pokemonCard = createPokemonCardFromDB(pokemon);
            container.appendChild(pokemonCard);
        });
        
        console.log(`Loaded ${savedPokemon.length} Pokemon from database`);
        
        // Remove any catch container when viewing collection
        const existingCatchContainer = document.querySelector('.catch-container');
        if (existingCatchContainer) {
            existingCatchContainer.remove();
        }
        
        sortPokemon('id'); 
    } catch (error) {
        console.error('Error loading saved Pokemon:', error);
    }
   
}

// Function to load saved Pokemon from database
const loadSavedPokemon = async () => {
    try {
        const sortfunction = document.getElementsByClassName('sort-controls')[0];
        sortfunction.style.visibility = 'visible'; // Hide sort function when viewing collection
        const response = await fetch('/api/get-pokemon');
        const savedPokemon = await response.json();
        
        const container = document.getElementById('pokemonContainer');
        container.innerHTML = ''; // Clear existing content
        
        savedPokemon.forEach(pokemon => {
            const pokemonCard = createPokemonCardFromDB(pokemon);
            container.appendChild(pokemonCard);
        });
        
        console.log(`Loaded ${savedPokemon.length} Pokemon from database`);
        
        // Remove any catch container when viewing collection
        const existingCatchContainer = document.querySelector('.catch-container');
        if (existingCatchContainer) {
            existingCatchContainer.remove();
        }
        
        sortPokemon('id'); 
    } catch (error) {
        console.error('Error loading saved Pokemon:', error);
    }
   
}

//Manav
//Buddy System use class "buddy-selected" to mark the buddy
const Buddy = async () => {
    try {
        await loadSavedPokemon();
        const loaded = document.querySelectorAll('.pokemon-card');
        let buddyCard = null; 

        loaded.forEach(card => {
            card.addEventListener('click', () => {
                const name = card.querySelector('.pokemon-name').textContent;

               
                if (buddyCard === card) {
                    card.classList.remove('buddy-selected');
                    buddyCard = null;
                    alert(`${name} is no longer your buddy!`);
                    console.log('Buddy removed');
                    return;
                }

              
                if (buddyCard) {
                    buddyCard.classList.remove('buddy-selected');
                }

                
                loaded.forEach(c => c.classList.remove('buddy-selected'));

              
                buddyCard = card;
                card.classList.add('buddy-selected');
                alert(`You have selected ${name} as your buddy!`);
                console.log('Buddy selected:', name);
            });
        });

    } catch (error) {
        console.error('Error loading saved Pokemon:', error);
    }
};





// Shop functions
function openShopModal() {
    const modal = document.getElementById('shopModal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function closeShopModal() {
    const modal = document.getElementById('shopModal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// function buyPokeball(ballType, price) {
//     if (userCoins >= price) {
//         // Deduct coins
//         userCoins -= price;
//         updateCoinsDisplay();
        
//         // Add to inventory
//         pokeballInventory[ballType]++;
//         updateBallCounts();
        
//         // Show success message
//         showNotification(`Successfully purchased 1 ${formatBallName(ballType)}!`, 'success');
//     } else {
//         // Show insufficient funds message
//         showNotification(`Not enough coins! You need ${price - userCoins} more coins.`, 'error');
//     }
// }

function showNotification(message, type) {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set message and type
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Show notification
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Function to update coins display
function updateCoinsDisplay() {
    const coinsElement = document.getElementById('userCoins');
    if (coinsElement) {
        coinsElement.textContent = userCoins;
    }
}

// Function to award coins based on Pokemon rarity
function awardCoinsForCatch(rarity) {
    let coinsEarned;

    switch (rarity) {
        case 'mythical':
            coinsEarned = Math.floor(Math.random() * (1000 - 800 + 1)) + 800;
            break;
        case 'legendary':
            coinsEarned = Math.floor(Math.random() * (700 - 500 + 1)) + 500;
            break;
        case 'ultra-beast':
            coinsEarned = Math.floor(Math.random() * (600 - 400 + 1)) + 400;
            break;
        case 'rare':
            coinsEarned = Math.floor(Math.random() * (350 - 250 + 1)) + 250;
            break;
        default: // common
            coinsEarned = Math.floor(Math.random() * (230 - 120 + 1)) + 120;
    }

    userCoins += coinsEarned;
    updateCoinsDisplay();
    updateCoinsInDB(userCoins); // Save the updated coins value in MongoDB

    return coinsEarned;
}

// Update the catchSuccess function to award coins
function catchSuccess() {
    // Save Pokemon to database
    savePokemonToDB(currentPokemon);
    
    // Award coins based on rarity
    const coinsEarned = awardCoinsForCatch(currentPokemon.rarity);
    
    // Show success message
    const resultDiv = document.getElementById('catch-result');
    resultDiv.className = 'catch-result success';
    resultDiv.textContent = `You caught ${currentPokemon.pokemonName.charAt(0).toUpperCase() + currentPokemon.pokemonName.slice(1)}! (+${coinsEarned} coins)`;
    
    // Reset current Pokemon
    currentPokemon = null;
    
    // Give time for user to see message, then clear
    setTimeout(() => {
        // Remove caught Pokemon from display
        const pokemonCard = document.getElementById('current-pokemon');
        if (pokemonCard) {
            pokemonCard.style.animation = 'slideIn 0.5s ease-out reverse';
            setTimeout(() => {
                const container = document.getElementById('pokemonContainer');
                container.innerHTML = '';
            }, 500);
        }
        
        // Clear catch result
        resultDiv.className = 'catch-result';
        resultDiv.textContent = '';
    }, 2000);
}

// Function for failed catch
function catchFailure() {
    // Show failure message
    const resultDiv = document.getElementById('catch-result');
    resultDiv.className = 'catch-result failure';
    resultDiv.textContent = `Oh no! ${currentPokemon.pokemonName.charAt(0).toUpperCase() + currentPokemon.pokemonName.slice(1)} broke free!`;
    
    // Give time for user to see message, then clear
    setTimeout(() => {
        resultDiv.className = 'catch-result';
        resultDiv.textContent = '';
    }, 2000);
}

// Function to update ball counts in the UI
function updateBallCounts() {
    for (const [ball, count] of Object.entries(pokeballInventory)) {
        const countElement = document.getElementById(`${ball}-count`);
        if (countElement) {
            countElement.textContent = count;
        }
    }
}

// Function to clear all Pokemon
function clearAllPokemon() {
    const pokemonContainer = document.getElementById('pokemonContainer');
    pokemonContainer.innerHTML = '';
    
    // Clear local storage if you're storing Pokemon there
    localStorage.removeItem('savedPokemon');
    
    // Optionally display a message
    const message = document.createElement('p');
    message.textContent = 'All Pokemon have been cleared!';
    message.className = 'clear-message';
    pokemonContainer.appendChild(message);
    
    // Remove the message after 3 seconds
    setTimeout(() => {
        if (pokemonContainer.contains(message)) {
            pokemonContainer.removeChild(message);
        }
    }, 3000);
}

// Initialize event listeners when document loads
document.addEventListener('DOMContentLoaded', async function () {
    try {
        await checkAuth();         // Wait for authentication check
        await loadCoins();         // Only then load coins
    } catch (error) {
        console.error("User not authenticated:", error);
        window.location.href = '/login';  // or your login page
    }

    updateBallCounts();
    initCardTiltEffect();
});


// 3D Card Tilt Effect
function initCardTiltEffect() {
    const container = document.getElementById('pokemonContainer');
    let currentTiltedCard = null;
    
    // Use event delegation to handle mouse events on Pokemon cards
    container.addEventListener('mousemove', function(event) {
        // Check if we're hovering over a Pokemon card
        const card = event.target.closest('.pokemon-card');
        if (!card) return;
        
        // If there was another card being tilted, reset it
        if (currentTiltedCard && currentTiltedCard !== card) {
            currentTiltedCard.classList.remove('tilting');
            currentTiltedCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
        }
        
        // Set current card as the one being tilted
        currentTiltedCard = card;
        
        // Add tilting class for the shine effect
        card.classList.add('tilting');
        
        // Get the dimensions and position of the card
        const rect = card.getBoundingClientRect();
        const cardWidth = rect.width;
        const cardHeight = rect.height;
        
        // Calculate mouse position relative to the card center
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Calculate rotation values (reduced from 15 to 8 degrees max)
        const rotateY = ((mouseX / cardWidth) - 0.5) * 8;
        const rotateX = -((mouseY / cardHeight) - 0.5) * 8;
        
        // Apply the 3D rotation
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03) translateY(-15px)`;
    });
    
    // Reset all cards when mouse leaves the container
    container.addEventListener('mouseleave', function() {
        if (currentTiltedCard) {
            currentTiltedCard.classList.remove('tilting');
            currentTiltedCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
            currentTiltedCard = null;
        }
    });
    
    // Reset a specific card when mouse leaves it
    container.addEventListener('mouseout', function(event) {
        const card = event.target.closest('.pokemon-card');
        if (!card) return;
        
        // Only reset if we're actually leaving the card (not just moving to child elements)
        if (!card.contains(event.relatedTarget)) {
            card.classList.remove('tilting');
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
            if (currentTiltedCard === card) {
                currentTiltedCard = null;
            }
        }
    });
}

// Add this function to handle tilt effect for newly created cards
function applyCardTiltEffect(card) {
    card.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const cardWidth = rect.width;
        const cardHeight = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const rotateY = ((mouseX / cardWidth) - 0.5) * 15;
        const rotateX = -((mouseY / cardHeight) - 0.5) * 15;
        
        this.classList.add('tilting');
        this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    
    card.addEventListener('mouseleave', function() {
        this.classList.remove('tilting');
        this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
}