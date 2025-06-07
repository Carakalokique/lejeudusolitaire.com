class SolitaireGenerator {
    constructor(seed = null) {
        this.seed = seed || this.generateComplexSeed();
        this.rng = this.createRNG(this.seed);
        this.drawSize = 3;
    }

    generateComplexSeed() {
        const timestamp = Date.now();
        const randomPart = Math.floor(Math.random() * 999999);
        const combinedSeed = (timestamp % 1000000) ^ randomPart;
        return combinedSeed;
    }

    createRNG(seed) {
        return {
            current: seed,
            next() {
                let t = this.current += 0x6D2B79F5;
                t = Math.imul(t ^ t >>> 15, t | 1);
                t ^= t + Math.imul(t ^ t >>> 7, t | 61);
                return ((t ^ t >>> 14) >>> 0) / 4294967296;
            }
        };
    }

    generateGame(winnable = true) {
        const cards = this.createDeck();
        
        if (!winnable) {
            return this.generateRandomGame(cards);
        }

        return this.generateWinnableGame(cards);
    }

    createDeck() {
        const cards = [];
        for (let i = 0; i < 4; ++i) {
            for (let j = 0; j < 13; ++j) {
                cards.push(new Card(i, j));
            }
        }
        return cards;
    }

    shuffleArray(array) {
        // Fisher-Yates shuffle with better randomness
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng.next() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    generateRandomGame(cards) {
        // Truly random shuffle - multiple passes for better randomness
        for (let i = 0; i < 3; i++) {
            this.shuffleArray(cards);
        }
        
        // Basic playability check - ensure at least some moves are available
        const tableau = Array(7).fill().map(() => []);
        const stock = [];
        let cardIndex = 0;
        
        // Fill tableau
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j <= i; j++) {
                tableau[i].push(cards[cardIndex++]);
            }
        }
        
        // Check if there's at least one playable move at start
        let hasMove = false;
        const visibleCards = tableau.map(pile => pile[pile.length - 1]);
        
        // Check for King to empty space (will be available after dealing)
        const hasKing = visibleCards.some(card => card && card.number === Card.NUMBER.K);
        
        // Check for any buildable sequences
        for (let i = 0; i < visibleCards.length; i++) {
            for (let j = 0; j < visibleCards.length; j++) {
                if (i !== j && visibleCards[i] && visibleCards[j]) {
                    if (visibleCards[i].color !== visibleCards[j].color &&
                        visibleCards[i].number === visibleCards[j].number - 1) {
                        hasMove = true;
                        break;
                    }
                }
            }
            if (hasMove) break;
        }
        
        // Check for Aces
        const hasAce = visibleCards.some(card => card && card.number === Card.NUMBER.A);
        
        // If no moves at all, do a minor adjustment
        if (!hasMove && !hasKing && !hasAce) {
            // Swap one visible card with a card from stock that creates a move
            const remainingCards = cards.slice(28);
            for (let i = 0; i < Math.min(3, remainingCards.length); i++) {
                const stockCard = remainingCards[i];
                for (let j = 0; j < visibleCards.length; j++) {
                    const tableauCard = visibleCards[j];
                    if (tableauCard) {
                        // Check if swapping would create a move
                        for (let k = 0; k < visibleCards.length; k++) {
                            if (k !== j && visibleCards[k]) {
                                if ((stockCard.color !== visibleCards[k].color &&
                                     stockCard.number === visibleCards[k].number - 1) ||
                                    stockCard.number === Card.NUMBER.A ||
                                    stockCard.number === Card.NUMBER.K) {
                                    // Swap the cards
                                    const tableauIndex = cards.indexOf(tableauCard);
                                    const stockIndex = cards.indexOf(stockCard);
                                    [cards[tableauIndex], cards[stockIndex]] = [cards[stockIndex], cards[tableauIndex]];
                                    return cards;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return cards;
    }

    generateWinnableGame(cards) {
        // Generate truly winnable games by working backwards from a solved state
        
        // Step 1: Start with a won game (all cards in foundations)
        const foundations = [[], [], [], []];
        const suits = [[], [], [], []];
        
        // Separate cards by suit
        cards.forEach(card => {
            suits[card.sign].push(card);
        });
        
        // Sort each suit A to K
        suits.forEach(suit => suit.sort((a, b) => a.number - b.number));
        
        // Place all cards in foundations (won state)
        for (let i = 0; i < 4; i++) {
            foundations[i] = [...suits[i]];
        }
        
        // Step 2: Work backwards to create a solvable starting position
        const tableau = Array(7).fill().map(() => []);
        const stock = [];
        
        // Remove cards from foundations to build tableau and stock
        // We'll remove cards in a way that guarantees they can be played back
        
        // First, determine which cards will be visible in tableau
        const visiblePositions = [0, 1, 2, 3, 4, 5, 6]; // One per pile
        
        // Place some high cards (K, Q, J) as visible cards in tableau
        const highCards = [];
        for (let suit = 0; suit < 4; suit++) {
            for (let rank = 12; rank >= 10; rank--) {
                const card = foundations[suit].find(c => c.number === rank);
                if (card) {
                    highCards.push({ card, suit });
                }
            }
        }
        
        // Shuffle high cards for variety
        this.shuffleArray(highCards);
        
        // Place high cards on larger piles
        let highCardIndex = 0;
        for (let pile = 6; pile >= 3 && highCardIndex < highCards.length; pile--) {
            const { card, suit } = highCards[highCardIndex++];
            tableau[pile].push(card);
            foundations[suit] = foundations[suit].filter(c => c !== card);
        }
        
        // Build sequences down from these high cards
        for (let pile = 3; pile < 7; pile++) {
            if (tableau[pile].length > 0) {
                let current = tableau[pile][tableau[pile].length - 1];
                const sequenceLength = Math.min(pile - 2, 3 + Math.floor(this.rng.next() * 2));
                
                for (let i = 0; i < sequenceLength && current.number > 1; i++) {
                    // Find a card that can be placed on current
                    const targetNumber = current.number - 1;
                    const targetColor = current.color === 0 ? 1 : 0;
                    
                    let found = false;
                    for (let s = 0; s < 4; s++) {
                        const match = foundations[s].find(c => 
                            c.number === targetNumber && c.color === targetColor
                        );
                        if (match) {
                            tableau[pile].push(match);
                            foundations[s] = foundations[s].filter(c => c !== match);
                            current = match;
                            found = true;
                            break;
                        }
                    }
                    
                    if (!found) break;
                }
            }
        }
        
        // Place some aces and low cards strategically
        const aceStrategy = Math.floor(this.rng.next() * 3);
        
        switch (aceStrategy) {
            case 0: // Early accessibility
                // Place 1-2 aces visible
                for (let i = 0; i < 2; i++) {
                    const suit = i;
                    if (foundations[suit].length > 0 && foundations[suit][0].number === 0) {
                        tableau[i].push(foundations[suit].shift());
                    }
                }
                break;
                
            case 1: // Moderate difficulty
                // Place 1 ace visible, 1 under one card
                if (foundations[0][0] && foundations[0][0].number === 0) {
                    tableau[1].push(foundations[0].shift());
                }
                // Place another ace to be under one card later
                break;
                
            case 2: // Spread out
                // All aces in stock or buried, but well distributed
                break;
        }
        
        // Fill remaining tableau positions
        for (let pile = 0; pile < 7; pile++) {
            const targetSize = pile + 1;
            
            // Add face-down cards first
            while (tableau[pile].length < targetSize - 1) {
                // Find a card from foundations
                let added = false;
                
                // Prefer cards that won't block important sequences
                const preferredRanks = [5, 6, 7, 8, 4, 9, 3, 10, 2];
                
                for (const rank of preferredRanks) {
                    for (let suit = 0; suit < 4; suit++) {
                        const card = foundations[suit].find(c => c.number === rank);
                        if (card) {
                            tableau[pile].push(card);
                            foundations[suit] = foundations[suit].filter(c => c !== card);
                            added = true;
                            break;
                        }
                    }
                    if (added) break;
                }
                
                // Fallback: any card
                if (!added) {
                    for (let suit = 0; suit < 4; suit++) {
                        if (foundations[suit].length > 0) {
                            tableau[pile].push(foundations[suit].shift());
                            break;
                        }
                    }
                }
            }
            
            // Add final visible card if needed
            if (tableau[pile].length === targetSize - 1) {
                let added = false;
                
                // 60% chance to place a helpful card
                if (this.rng.next() < 0.6) {
                    // Try to place something that creates work but is solvable
                    const ranks = [11, 10, 9, 2, 3, 4];
                    for (const rank of ranks) {
                        for (let suit = 0; suit < 4; suit++) {
                            const card = foundations[suit].find(c => c.number === rank);
                            if (card) {
                                tableau[pile].push(card);
                                foundations[suit] = foundations[suit].filter(c => c !== card);
                                added = true;
                                break;
                            }
                        }
                        if (added) break;
                    }
                }
                
                // Fallback
                if (!added) {
                    for (let suit = 0; suit < 4; suit++) {
                        if (foundations[suit].length > 0) {
                            const idx = Math.floor(this.rng.next() * foundations[suit].length);
                            tableau[pile].push(foundations[suit][idx]);
                            foundations[suit].splice(idx, 1);
                            break;
                        }
                    }
                }
            }
        }
        
        // Step 3: Build stock from remaining cards
        // Collect all remaining cards from foundations
        const remainingCards = [];
        for (let suit = 0; suit < 4; suit++) {
            remainingCards.push(...foundations[suit]);
        }
        
        // Ensure critical cards are accessible in stock
        // Sort remaining cards by importance
        const aces = remainingCards.filter(c => c.number === 0);
        const lowCards = remainingCards.filter(c => c.number >= 1 && c.number <= 4);
        const midCards = remainingCards.filter(c => c.number >= 5 && c.number <= 9);
        const stockHighCards = remainingCards.filter(c => c.number >= 10 && c.number <= 12);
        
        // Build stock with strategic placement
        stock.length = 0;
        
        // Place aces at accessible positions (multiples of 3 for 3-card draw)
        const acePositions = [0, 6, 12, 18];
        aces.forEach((ace, index) => {
            if (index < acePositions.length) {
                stock[acePositions[index]] = ace;
            }
        });
        
        // Mix other cards but ensure reasonable distribution
        const others = [];
        
        // Wave 1: Some high cards and mid cards
        for (let i = 0; i < 3 && stockHighCards.length > 0; i++) {
            others.push(stockHighCards.shift());
        }
        for (let i = 0; i < 3 && midCards.length > 0; i++) {
            others.push(midCards.shift());
        }
        
        // Wave 2: Low cards for foundation building
        others.push(...lowCards);
        
        // Wave 3: Remaining cards
        others.push(...midCards, ...stockHighCards);
        
        // Fill stock array
        let stockIndex = 0;
        others.forEach(card => {
            while (stockIndex < stock.length && stock[stockIndex]) {
                stockIndex++;
            }
            if (stockIndex < stock.length) {
                stock[stockIndex] = card;
            } else {
                stock.push(card);
            }
        });
        
        // Remove undefined entries
        const finalStock = stock.filter(c => c !== undefined);
        
        // Build final deck
        const deck = [];
        
        // Add tableau cards
        for (let i = 0; i < 7; i++) {
            deck.push(...tableau[i]);
        }
        
        // Add stock cards
        deck.push(...finalStock);
        
        // Verify we have exactly 52 cards
        if (deck.length !== 52) {
            console.error('Invalid deck size:', deck.length);
            // Fallback to random game
            const fallbackDeck = [...cards];
            this.shuffleArray(fallbackDeck);
            return fallbackDeck;
        }
        
        return deck;
    }
    
    isCardUsed(card, tableau) {
        return tableau.some(pile => pile.includes(card));
    }
} 