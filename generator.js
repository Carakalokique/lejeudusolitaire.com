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
            this.shuffleArray(cards);
            this.shuffleArray(cards);
            return cards;
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
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng.next() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    generateWinnableGame(cards) {
        const tableau = Array(7).fill().map(() => []);
        const stock = [];
        
        // First pass: distribute kings more randomly
        const kings = cards.filter(card => card.number === Card.NUMBER.K);
        this.shuffleArray(kings);
        
        // Randomly decide how many tableau piles will start with kings (2-4)
        const guaranteedKings = 2 + Math.floor(this.rng.next() * 3);
        // Randomly choose which piles get the kings
        const kingPositions = [];
        while (kingPositions.length < guaranteedKings) {
            const pos = Math.floor(this.rng.next() * 7);
            if (!kingPositions.includes(pos)) {
                kingPositions.push(pos);
            }
        }
        
        // Place kings in selected positions
        for (let i = 0; i < guaranteedKings && i < kings.length; i++) {
            tableau[kingPositions[i]].push(kings[i]);
            cards.splice(cards.indexOf(kings[i]), 1);
        }

        // For positions without kings, start with high cards (10-Q)
        for (let i = 0; i < 7; i++) {
            if (tableau[i].length === 0) {
                const highCards = cards.filter(card => 
                    card.number >= Card.NUMBER[10] && 
                    card.number <= Card.NUMBER.Q
                );
                if (highCards.length > 0) {
                    const selectedCard = highCards[Math.floor(this.rng.next() * highCards.length)];
                    tableau[i].push(selectedCard);
                    cards.splice(cards.indexOf(selectedCard), 1);
                }
            }
        }

        // Second pass: create partial buildable sequences
        for (let i = 0; i < 7; i++) {
            const stackSize = i + 1;
            while (tableau[i].length < stackSize) {
                const lastCard = tableau[i][tableau[i].length - 1];
                
                // 70% chance to try building a sequence
                if (lastCard && this.rng.next() < 0.7) {
                    const buildableCards = cards.filter(card => 
                        card.color !== lastCard.color && 
                        card.number === lastCard.number - 1
                    );
                    
                    if (buildableCards.length > 0) {
                        const selectedCard = buildableCards[Math.floor(this.rng.next() * buildableCards.length)];
                        tableau[i].push(selectedCard);
                        cards.splice(cards.indexOf(selectedCard), 1);
                        continue;
                    }
                }
                
                // Otherwise pick semi-random card
                const index = Math.floor(this.rng.next() * cards.length);
                tableau[i].push(cards[index]);
                cards.splice(index, 1);
            }
        }

        // Organize remaining cards into stock with controlled randomness
        const remainingCards = [...cards];
        
        // First, analyze what's needed for tableau building
        const tableauTops = tableau.map(stack => stack[stack.length - 1]);
        const neededRanks = new Set();
        tableauTops.forEach(card => {
            if (card) neededRanks.add(card.number - 1);
        });

        // Create balanced groups of 3 cards
        while (remainingCards.length > 0) {
            const group = [];
            
            // First card: 60% chance to pick a needed rank
            if (this.rng.next() < 0.6 && neededRanks.size > 0) {
                const neededRanksArray = Array.from(neededRanks);
                const targetRank = neededRanksArray[Math.floor(this.rng.next() * neededRanksArray.size)];
                const possibleCards = remainingCards.filter(card => card.number === targetRank);
                
                if (possibleCards.length > 0) {
                    const card = possibleCards[Math.floor(this.rng.next() * possibleCards.length)];
                    group.push(card);
                    remainingCards.splice(remainingCards.indexOf(card), 1);
                }
            }

            // Fill the rest of the group
            while (group.length < this.drawSize && remainingCards.length > 0) {
                // Try to avoid putting too many same-rank cards together
                const lastCard = group[group.length - 1];
                let candidates = remainingCards;
                
                if (lastCard) {
                    // Avoid same rank and prefer different colors
                    candidates = remainingCards.filter(card => 
                        card.number !== lastCard.number &&
                        (this.rng.next() < 0.7 ? card.color !== lastCard.color : true)
                    );
                }
                
                if (candidates.length === 0) {
                    candidates = remainingCards;
                }

                const index = Math.floor(this.rng.next() * candidates.length);
                group.push(candidates[index]);
                remainingCards.splice(remainingCards.indexOf(candidates[index]), 1);
            }

            // 30% chance to shuffle each group
            if (this.rng.next() < 0.3) {
                this.shuffleArray(group);
            }
            
            stock.push(...group);
        }

        // Occasionally shuffle sections of the stock
        const stockGroups = [];
        for (let i = 0; i < stock.length; i += 9) {
            stockGroups.push(stock.slice(i, i + 9));
        }
        
        stockGroups.forEach(group => {
            if (this.rng.next() < 0.5) {
                this.shuffleArray(group);
            }
        });

        // Combine tableau and stock
        const finalDeck = [];
        for (let i = 0; i < 7; i++) {
            finalDeck.push(...tableau[i]);
        }
        finalDeck.push(...stockGroups.flat());

        return finalDeck;
    }
} 