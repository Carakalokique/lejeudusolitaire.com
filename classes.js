class Card
{
    static COLOR = {
        RED: 0,
        BLACK: 1
    }

    static SIGN = {
        DIAMOND: 0,
        HEART: 1,
        SPADE: 2,
        CLUB: 3
    }

    static NUMBER = {
        A: 0,
        2: 1,
        3: 2,
        4: 3,
        5: 4,
        6: 5,
        7: 6,
        8: 7,
        9: 8,
        10: 9,
        J: 10,
        Q: 11,
        K: 12
    }
    constructor(sign = 0, number = 0){

        this.node = document.createElement('div')
        this.node.instance = this
        this.node.className = 'card hidden'
        this.upsideDown = true
        this.bypassAutoplay = false
        this.container = null

        this.node.style.backgroundPositionX = `calc(${-number}  * var(--card-size))`
        this.node.style.backgroundPositionY = `calc(${-sign}  * var(--card-size) * ${512/352})`

        this.sign = sign
        this.number = number
        this.color = (sign === Card.SIGN.HEART || sign === Card.SIGN.DIAMOND) ? Card.COLOR.RED : Card.COLOR.BLACK


        let prevX, prevY
        let totalX, totalY



        let startTime = 0
        const dragStart = (e) =>
        {
            //e.preventDefault()
            if(this.upsideDown)
                return

            if(this.container.type === CardContainer.TYPE.WASTE && this.container.lastCard !== this)
                return

            startTime = Date.now()

            prevX = e.clientX || e.touches[0].clientX
            prevY = e.clientY || e.touches[0].clientY
            totalX = totalY = 0
            addEventListener('mousemove', drag)
            addEventListener('touchmove', drag, {passive: false})
            addEventListener('mouseup', dragEnd)
            addEventListener('touchend', dragEnd)



            selectedCards = this.container.getCardsAfter(this)

            while(document.querySelector('.card.drag'))
                document.querySelector('.card.drag').classList.remove('drag')
        }
        const drag = (e) =>
        {
            e.preventDefault()
            this.node.classList.add('drag')
            this.container.node.style.zIndex = 9999

            const currentX = e.clientX || e.touches[0].clientX
            const currentY = e.clientY || e.touches[0].clientY
            const deltaX = currentX - prevX
            const deltaY = currentY - prevY
            totalX += deltaX
            totalY += deltaY
            selectedCards.forEach(card => card.node.style.transform = `translate(${totalX}px, ${totalY}px)`)

            prevX = currentX
            prevY = currentY
        }
        const dragEnd = (e) =>
        {
            removeEventListener('mousemove', drag)
            removeEventListener('touchmove', drag)
            removeEventListener('mouseup', dragEnd)
            removeEventListener('touchend', dragEnd)

            let parent = null
            const delta = Date.now() - startTime
            let needsAnim = false
            if(delta < 200 && delta > 20)
            {
                conts.targets.forEach(cont => {
                    if(cont !== this.container && cont.isAllowed(selectedCards[0], selectedCards) && !(this.container.type === CardContainer.TYPE.FOUNDATION && cont.type === CardContainer.TYPE.FOUNDATION))
                    {
                        if(parent === null)
                        {
                            parent = cont
                            needsAnim = true
                        }
                    }
                })
            }
            else
            {
                const x = e.pageX || e.changedTouches[0].pageX
                const y = e.pageY || e.changedTouches[0].pageY


                const target = document.elementFromPoint(x, y)

                if(target && target.classList.contains('card-container'))
                    parent = target.instance
                else if(target && target.classList.contains('card'))
                    parent = target.parentElement.instance

                if(parent && !parent.isAllowed(selectedCards[0], selectedCards))
                    parent = null
            }


            this.container.node.style.zIndex = 1
            const prevContainer = this.container

            if(parent)
            {
                const step = []
                selectedCards.forEach(card => {
                    step.push({card: card, from: card.container, to: parent})
                })
                steps.push(step)
            }

            selectedCards.forEach(card => card.moveToContainer(parent || this.container, needsAnim))
            const movedCard = selectedCards[0]
            setTimeout(() => autoplay(movedCard), 250)

            selectedCards = []

            prevContainer.onCardMove()
            this.node.classList.remove('drag')

            checkForWin()


        }

        this.node.addEventListener('mousedown', dragStart)
        this.node.addEventListener('touchstart', dragStart)
    }

    getNextStep()
    {
        if(!this.container)
            return null
        let parent = null
        const cards = this.container.getCardsAfter(this)
        conts.targets.forEach(cont => {
            if(cont !== this.container && cont.isAllowed(cards[0], cards))
            {
                if(parent === null)
                {
                    parent = cont
                }
            }
        })
        return parent
    }
    moveToContainer(container, needsAnim = false)
    {
        //Maybe move this to the CardContainer so I can move the cards at the same time, and use the same animation
        let oldPos = null
        if(this.container)
        {
            this.container.removeCard(this)
            oldPos = this.getAbsolutePos()

            if(this.container.type === CardContainer.TYPE.FOUNDATION && container.type === CardContainer.TYPE.TABLEAU)
                this.bypassAutoplay = true

            if(container.type === CardContainer.TYPE.TABLEAU && container.cards.length > 0)
            {
                container.lastCard.bypassAutoplay = false
            }
        }
        container.addCard(this)
        this.node.style.transform = ``
        this.container = container

        const newPos = this.getAbsolutePos()

        if(needsAnim)
        {
            this.playAnimation(oldPos, newPos)
        }

        if(container.type === CardContainer.TYPE.FOUNDATION)
            setTimeout(() => autoplay(), 250)
        //autoplayStep(container)

    }

    playAnimation(oldPos, newPos)
    {
        const delta = {
            x: oldPos.x - newPos.x,
            y: oldPos.y - newPos.y
        }

        if(delta.x === 0 && delta.y === 0)
            return

        const step = {
            x: delta.x / 20,
            y: delta.y / 20,
        }

        let i = 0


        this.node.style.transform = `translate(${delta.x}px, ${delta.y}px)`
        this.container.node.style.zIndex = `999`


        const animInterval = setInterval(()=>{
            ++i
            this.node.style.transform = `translate(${delta.x - step.x * i}px, ${delta.y - step.y * i}px)`
            if(i === 20)
            {
                this.node.style.transform = ``
                this.container.node.style.zIndex = `0`
                clearInterval(animInterval)
            }
        },10)


    }

    getAbsolutePos()
    {
        return {
            x: this.node.offsetLeft + this.node.parentElement.offsetLeft,
            y: this.node.offsetTop + this.node.parentElement.offsetTop
        }
    }
    reveal(needsAnim = false)
    {
        if(!this.upsideDown)
            return


        this.upsideDown = false

        if(needsAnim)
        {
            this.node.classList.add('flip')
            setTimeout(() => this.node.classList.remove('hidden'), 150)
            setTimeout(() => this.node.classList.remove('flip'), 300)
        }
        else
        {
            this.node.classList.remove('hidden')
        }
    }
    hide()
    {
        this.node.classList.add('hidden')
        this.upsideDown =  true
    }
}
let selectedCards = []
class CardContainer
{
    static TYPE = {
        FOUNDATION: 1,
        TABLEAU: 2,
        WASTE: 3,
        HIDDEN: 4,
    }
    constructor(type, x, y) {

        this.cards = []
        this.type = type
        this.node = document.createElement('div')
        this.node.instance = this
        this.node.className = 'card-container type-' + type
        this.node.style.left = x + (typeof x === 'number' ? 'px' : '')
        this.node.style.top = y + (typeof y === 'number' ? 'px' : '')
        if(type !== CardContainer.TYPE.HIDDEN)
            document.querySelector('.game-area').append(this.node)

    }

    get lastCard()
    {
        return this.cards.length > 0 ? this.cards[this.cards.length - 1] : null
    }

    reset()
    {
        this.cards = []
        this.node.innerHTML = ''
    }

    addCard(card)
    {
        this.cards.push(card)
        this.node.append(card.node)
    }

    removeCard(cardToRemove)
    {
        this.cards = this.cards.filter(card => card !== cardToRemove)
    }

    getCardsAfter(afterCard)
    {
        const cards = []
        let cardFound = false
        this.cards.forEach(card => {
            if(card === afterCard)
                cardFound = true

            if(cardFound)
                cards.push(card)
        })
        return cards
    }

    getCardBefore(card)
    {
        for(let i = this.cards.length - 1; i >= 0; --i)
        {
            if(this.cards[i + 1] === card)
                return this.cards[i]
        }
        return null

    }

    onCardMove()
    {
        if(this.type === CardContainer.TYPE.TABLEAU)
            if(this.cards.length > 0)
            {
                const lastCard = this.cards[this.cards.length - 1]
                lastCard.reveal(true)
            }
    }

    isAllowed(card, allCards)
    {
        switch (this.type)
        {
            case CardContainer.TYPE.FOUNDATION:

                if(allCards.length > 1)
                    return false

                if(this.cards.length === 0 && card.number === Card.NUMBER.A)
                    return true
                else if(this.cards.length > 0)
                {
                    const lastCard = this.cards[this.cards.length - 1]

                    if(lastCard.sign === card.sign && lastCard.number === card.number - 1)
                        return true
                    else
                        return false
                }

                return false

            case CardContainer.TYPE.TABLEAU:
                if(this.cards.length === 0)
                    return card.number === Card.NUMBER.K

                const lastCard = this.cards[this.cards.length - 1]


                if(lastCard.color !== card.color && lastCard.number === card.number + 1)
                    return true

                return false

            case CardContainer.TYPE.WASTE:
                return false

            case CardContainer.TYPE.HIDDEN:
                return true
        }
    }
}
