const amountToPull = 3;
let autoplayEnabled = false;
const modal = document.getElementById('game-modal');
const returnText = document.getElementById('return-text');
const winnableGameBtn = document.getElementById('winnable-game');
const randomGameBtn = document.getElementById('random-game');

function createCards() {
  let cards = [];
  for (let i = 0; i < 4; ++i)
    for (let j = 0; j < 13; ++j) {
      cards.push(new Card(i, j));
    }
  shuffleArray(cards);
  shuffleArray(cards);
  return cards;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
const conts = {};
function createConts() {
  const w = 120;
  const h = w * 1.5;
  conts.targets = [];

  conts.stock = new CardContainer(
    1,
    `calc(var(--card-size) * .2)`,
    "calc(var(--card-size) * .1)"
  );
  conts.waste = new CardContainer(
    3,
    `calc(var(--card-size) * ${1.1 + 0.2})`,
    "calc(var(--card-size) * .1)"
  );
  conts.foundation = [];
  for (let i = 0; i < 4; ++i) {
    conts.foundation.push(
      new CardContainer(
        1,
        `calc(var(--card-size) * ${(3 + i) * 1.1 + 0.2})`,
        "calc(var(--card-size) * .1)"
      )
    );
    conts.targets.push(conts.foundation[i]);
  }

  conts.tableau = [];
  for (let i = 0; i < 7; ++i) {
    conts.tableau.push(
      new CardContainer(
        2,
        `calc(var(--card-size) * ${i * 1.1 + 0.2})`,
        "calc(var(--card-size) * 1.7)"
      )
    );
    conts.targets.push(conts.tableau[i]);
  }

  conts.hidden = new CardContainer(4);

  distributeCards();
}
function distributeCards() {
  const cards = createCards();

  conts.stock.reset();
  conts.waste.reset();
  conts.hidden.reset();
  conts.foundation.forEach((cont) => cont.reset());
  conts.tableau.forEach((cont) => cont.reset());

  let cardID = 0;
  for (let i = 0; i < 7; ++i) {
    for (let j = 0; j <= i; ++j) {
      cards[cardID].moveToContainer(conts.tableau[i]);

      if (i === j) {
        cards[cardID].reveal();
      } else {
        cards[cardID].hide();
      }

      cardID++;
    }
  }

  while (cardID < cards.length) {
    cards[cardID].moveToContainer(conts.stock);
    cards[cardID].hide();
    cardID++;
  }
}

let stockCooldown = false;

let steps = [];
async function clickStock() {
  if (stockCooldown) return;

  stockCooldown = true;
  setTimeout(() => (stockCooldown = false), 150);
  const step = [];

  if (conts.stock.cards.length > 0) {
    let lastID = conts.stock.cards.length - 1;
    for (let i = 0; i < amountToPull && conts.stock.cards[lastID]; ++i) {
      step.push({
        card: conts.stock.cards[lastID],
        from: conts.stock.cards[lastID].container,
        to: conts.waste,
      });

      conts.stock.cards[lastID].reveal();
      conts.stock.cards[lastID].moveToContainer(conts.waste, true);

      lastID = conts.stock.cards.length - 1;
    }
    steps.push(step.reverse());
  } else if (conts.stock.cards.length === 0) {
    let lastID = conts.waste.cards.length - 1;
    while (conts.waste.cards[lastID]) {
      step.push({
        card: conts.waste.cards[lastID],
        from: conts.waste.cards[lastID].container,
        to: conts.stock,
      });
      conts.waste.cards[lastID].hide();
      conts.waste.cards[lastID].moveToContainer(conts.stock);
      lastID = conts.waste.cards.length - 1;
    }
    steps.push(step.reverse());
  }

  await delay(250);
  autoplay();
}

function undo() {
  if (steps.length === 0) return;

  const step = steps.pop();
  step.forEach((substep, i) => {
    substep.card.moveToContainer(substep.from, true);
    if (substep.from === conts.stock) substep.card.hide();
    if (substep.from === conts.waste) substep.card.reveal();

    if (
      i === 0 &&
      substep.from.type === CardContainer.TYPE.TABLEAU &&
      substep.from.cards.length > 1
    ) {
      const lastBefore = substep.from.cards[substep.from.cards.length - 2];
      const currentCard = substep.card;

      if (
        lastBefore.color === currentCard.color ||
        lastBefore.number !== currentCard.number + 1
      )
        lastBefore.hide();
    }
  });
}

let timerInterval;

let timeElapsed = 0;
function timer() {
  ++timeElapsed;

  const timeStr = `${~~(timeElapsed / 60)}:${
    timeElapsed % 60 >= 10 ? "" : "0"
  }${timeElapsed % 60}`;
  document.getElementById("timer-desktop").innerHTML = "Time: " + timeStr;
  document.getElementById("timer-mobile").innerHTML = timeStr;
}
function restartGame(bypass = false) {
  if (!bypass) {
    showModal(true);
    return;
  }

  steps.length = 0;
  autoplayEnabled = false;
  distributeCards();
  timeElapsed = 0;
  gameFinished = false;
  gameOverAnim.stop();

  if (!timerInterval) timerInterval = setInterval(timer, 1000);
  hideModal();
}

let gameFinished = false;
function gameOverAnimation() {
  gameFinished = true;
  gameOverAnim.start();
  clearInterval(timerInterval);
  timerInterval = undefined;
  
  setTimeout(() => {
    showModal(false);
  }, 2000);
}

function setupGameOverAnimation() {
  const cardSheet = new Image();
  cardSheet.src = "./assets/mobile/allcards.png";
  cardSheet.onload = () => {
    resize();
    createCard();
    cardSheet.onload = () => {};
  };

  cardSheet.addEventListener("load", (e) => {
    card_texture_w = cardSheet.width / 13;
    card_texture_h = cardSheet.height / 4;
  });

  let animRunning = false;

  const canvas = document.getElementById("game-over-canvas");
  canvas.width = document.getElementById("game-area").offsetWidth;
  canvas.height = Math.min(
    document.getElementById("game-area").offsetHeight,
    document.getElementById("game-area").offsetWidth * 0.6
  );
  canvas.style.display = "none";
  const ctx = canvas.getContext("2d");

  let card_w, card_h, card_texture_w, card_texture_h;
  let desktopMode = false;

  function resize() {
    card_w = document.querySelector(".card").offsetWidth;
    card_h = document.querySelector(".card").offsetHeight;

    desktopMode = innerWidth >= 700;

    if (desktopMode) cardSheet.src = "./assets/desktop/allcards.png";
  }

  addEventListener("resize", resize);

  function drawCard(x, y, sign, number) {
    ctx.drawImage(
      cardSheet,
      number * card_texture_w,
      sign * card_texture_h,
      card_texture_w,
      card_texture_h,
      x,
      y,
      card_w,
      card_h
    );
  }

  let cardAmount = 0;
  function createCard() {
    // TODO Check Math Random for Animation Issue
    const number = ~~(Math.random() * 13);
    const sign = ~~(Math.random() * 4);
    let ay = 0;
    ++cardAmount;

    if (cardAmount > 10) restartGame(true);

    let running = true;
    let x = Math.random() * canvas.width;
    let ax = x < canvas.width / 2 ? 3 : -3;
    let y = 0;
    let bounces = 0;
    function tick() {
      ay += 0.5;

      y += ay;
      x += ax;

      drawCard(x, y, sign, number);

      if (y > canvas.height - 100) {
        y = canvas.height - 100;
        ay *= -0.8;
        ++bounces;
      }

      if (bounces > 4) {
        running = false;
        createCard();
      }

      if (running && gameFinished) requestAnimationFrame(tick);
    }

    tick();
  }

  function start() {
    if (animRunning) return;
    cardAmount = 0;
    animRunning = true;
    createCard();
    canvas.style.display = "block";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  function stop() {
    animRunning = false;
    canvas.style.display = "none";
  }

  return { start: () => start(), stop: () => stop() };
}

function fullAutoplayStep() {
  let finished = false;
  [...conts.tableau, conts.waste].forEach((cont) => {
    if (finished) return;

    cont.cards.forEach((card) => {
      if (finished) return;
      if (!card.upsideDown) {
        const goal =
          cont.type === CardContainer.TYPE.TABLEAU
            ? card.getNextStep()
            : card.container.lastCard.getNextStep();

        if (goal) {
          if (
            cont.type === CardContainer.TYPE.TABLEAU &&
            goal.type === CardContainer.TYPE.TABLEAU &&
            !(
              (card.container.getCardBefore(card) &&
                card.container.getCardBefore(card).upsideDown) ||
              (!card.container.getCardBefore(card) && goal.cards.length > 0)
            )
          ) {
            return;
          }

          const step = [];

          finished = true;
          const container = card.container;

          if (cont.type === CardContainer.TYPE.TABLEAU)
            container.getCardsAfter(card).forEach((card2) => {
              step.push({
                card: card2,
                from: container,
                to: goal,
              });
              card2.moveToContainer(goal, true);
            });
          else {
            card.container.lastCard.moveToContainer(goal, true);
            step.push({
              card: card.container.lastCard,
              from: container,
              to: goal,
            });
          }

          container.onCardMove();
          steps.push(step);
        }
      }
    });
  });

  if (!finished) clickStock();

  checkForWin();
}

async function autoplay(movedCard) {
  if (!autoplayEnabled && movedCard) {
    // Only enable autoplay if a card was manually moved to foundation
    const isFirstFoundationMove = movedCard.container && 
                                movedCard.container.type === CardContainer.TYPE.FOUNDATION;
    if (isFirstFoundationMove) {
      autoplayEnabled = true;
    }
  }

  if (!autoplayEnabled) return;

  for (let i = 0; i < 4; ++i)
    await autoplayStep(conts.foundation[i], movedCard);
}

async function autoplayStep(goal, movedCard) {
  let positiveOutcome = false;
  [...conts.tableau, conts.waste].forEach((cont) => {
    if (
      cont.lastCard &&
      !cont.lastCard.bypassAutoplay &&
      cont.lastCard !== movedCard &&
      cont.lastCard.getNextStep() === goal &&
      !positiveOutcome
    ) {
      positiveOutcome = true;
      steps.push([
        {
          card: cont.lastCard,
          from: cont,
          to: goal,
        },
      ]);

      cont.lastCard.moveToContainer(goal, true);
      cont.onCardMove();
    }
  });

  checkForWin();

  if (positiveOutcome) {
    await delay(700);
    autoplayStep(goal);
  }
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkForWin() {
  let total = 0;
  conts.foundation.forEach((cont) => (total += cont.cards.length));
  if (total >= 52) gameOverAnimation();
}
const gameOverAnim = setupGameOverAnimation();

createConts();
restartGame(true);
document.getElementById("game-over-canvas").onclick = () => restartGame(true);
conts.stock.node.addEventListener("click", clickStock);
//conts.stock.node.addEventListener('touchstart', clickStock)

returnText.addEventListener('click', hideModal);
randomGameBtn.addEventListener('click', () => restartGame(true));
winnableGameBtn.addEventListener('click', () => {
  console.log('Winnable game to be implemented');
  restartGame(true);
});

function showModal(showReturn = true) {
  modal.style.display = 'block';
  returnText.style.display = showReturn ? 'block' : 'none';
}

function hideModal() {
  modal.style.display = 'none';
}

// Add click event listener to modal container
modal.addEventListener('click', (e) => {
  // Check if click is directly on the modal container (outside modal content)
  if (e.target === modal) {
    hideModal();
  }
});
