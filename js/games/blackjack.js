const SUITS = ["S", "H", "D", "C"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") {
      aces += 1;
      total += 11;
    } else if (["K", "Q", "J"].indexOf(card.rank) !== -1) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function renderCard(card, hidden = false) {
  if (hidden) {
    return [
      "+-----+",
      "|#####|",
      "|#####|",
      "|#####|",
      "+-----+",
    ];
  }
  const rank = card.rank;
  const top = rank.padEnd(5, " ");
  const bottom = rank.padStart(5, " ");
  return [
    "+-----+",
    `|${top}|`,
    `|  ${card.suit}  |`,
    `|${bottom}|`,
    "+-----+",
  ];
}

function renderCards(cards, hideSecond = false) {
  if (!cards.length) {
    return "[no hand]";
  }
  const rendered = cards.map((card, index) => renderCard(card, hideSecond && index === 1));
  const lines = [];
  for (let i = 0; i < 5; i += 1) {
    lines.push(rendered.map((cardLines) => cardLines[i]).join(" "));
  }
  return lines.join("\n");
}

function initBlackjack({ rootEl, state }) {
  const { getBankroll, setBankroll } = window.CasinoState;
  const dealerCardsEl = rootEl.querySelector("#dealer-cards");
  const playerCardsEl = rootEl.querySelector("#player-cards");
  const dealerValueEl = rootEl.querySelector("#dealer-value");
  const playerValueEl = rootEl.querySelector("#player-value");
  const statusEl = rootEl.querySelector("#round-status");
  const betDisplay = rootEl.querySelector("#bet-display");
  const bankrollEl = rootEl.querySelector("#bankroll");
  const dealBtn = rootEl.querySelector("#deal");
  const hitBtn = rootEl.querySelector("#hit");
  const standBtn = rootEl.querySelector("#stand");
  const newHandBtn = rootEl.querySelector("#new-hand");
  const chipButtons = rootEl.querySelectorAll(".chip");

  let deck = [];
  let dealerHand = [];
  let playerHand = [];
  let bet = 0;
  let phase = "idle"; // idle | player | dealer | roundOver

  function formatMoney(amount) {
    if (Number.isInteger(amount)) {
      return String(amount);
    }
    return amount.toFixed(1);
  }

  function updateBankroll(amount) {
    setBankroll(state, amount);
    if (bankrollEl) {
      bankrollEl.textContent = `$${formatMoney(amount)}`;
    }
    if (typeof CustomEvent === "function") {
      document.dispatchEvent(new CustomEvent("bankroll:change", { detail: { bankroll: amount } }));
    } else if (document && document.createEvent) {
      const event = document.createEvent("Event");
      event.initEvent("bankroll:change", true, true);
      event.detail = { bankroll: amount };
      document.dispatchEvent(event);
    }
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function updateBetDisplay() {
    betDisplay.textContent = `$${formatMoney(bet)}`;
  }

  function updateControls() {
    const canAdjust = phase === "idle" || phase === "roundOver";
    const hasBet = bet > 0;
    const canReset = canAdjust && (hasBet || dealerHand.length || playerHand.length);
    dealBtn.disabled = !canAdjust || !hasBet;
    hitBtn.disabled = phase !== "player";
    standBtn.disabled = phase !== "player";
    for (let i = 0; i < chipButtons.length; i += 1) {
      chipButtons[i].disabled = !canAdjust;
    }
    newHandBtn.disabled = !canReset;
  }

  function updateHands(hideDealer = true) {
    dealerCardsEl.textContent = renderCards(dealerHand, hideDealer);
    playerCardsEl.textContent = renderCards(playerHand, false);

    const dealerValue = handValue(dealerHand);
    const playerValue = handValue(playerHand);
    if (hideDealer) {
      dealerValueEl.textContent = "VALUE: ?";
    } else {
      dealerValueEl.textContent = `VALUE: ${dealerValue}`;
    }
    playerValueEl.textContent = `VALUE: ${playerValue}`;
  }

  function freshDeck() {
    deck = shuffle(buildDeck());
  }

  function drawCard() {
    if (!deck.length) {
      freshDeck();
    }
    return deck.pop();
  }

  function settleRound(result) {
    phase = "roundOver";
    let payoutMessage = "";
    const bankroll = getBankroll(state);
    if (result === "player_blackjack") {
      updateBankroll(bankroll + bet * 2.5);
      payoutMessage = `BLACKJACK +$${formatMoney(bet * 1.5)}`;
    } else if (result === "player_win") {
      updateBankroll(bankroll + bet * 2);
      payoutMessage = `WIN +$${formatMoney(bet)}`;
    } else if (result === "push") {
      updateBankroll(bankroll + bet);
      payoutMessage = "PUSH BET RETURNED";
    } else {
      payoutMessage = "LOSS";
    }
    bet = 0;
    updateBetDisplay();
    setStatus(`ROUND OVER :: ${payoutMessage} :: PLACE BETS THEN DEAL`);
    updateControls();
  }

  function checkForBlackjack() {
    const playerValue = handValue(playerHand);
    const dealerValue = handValue(dealerHand);
    const playerBlackjack = playerValue === 21 && playerHand.length === 2;
    const dealerBlackjack = dealerValue === 21 && dealerHand.length === 2;

    if (playerBlackjack || dealerBlackjack) {
      updateHands(false);
      if (playerBlackjack && dealerBlackjack) {
        settleRound("push");
      } else if (playerBlackjack) {
        settleRound("player_blackjack");
      } else {
        settleRound("dealer_blackjack");
      }
      return true;
    }
    return false;
  }

  function startHand() {
    if (!(phase === "idle" || phase === "roundOver")) {
      return;
    }
    if (bet <= 0) {
      setStatus("PLACE BETS THEN DEAL");
      updateControls();
      return;
    }

    freshDeck();
    dealerHand = [drawCard(), drawCard()];
    playerHand = [drawCard(), drawCard()];
    phase = "player";
    setStatus("PLAYER TURN :: HIT OR STAND");
    updateHands(true);
    updateControls();

    if (checkForBlackjack()) {
      return;
    }
  }

  function hit() {
    if (phase !== "player") {
      return;
    }
    playerHand.push(drawCard());
    updateHands(true);
    const value = handValue(playerHand);
    if (value > 21) {
      updateHands(false);
      settleRound("player_bust");
    }
  }

  function stand() {
    if (phase !== "player") {
      return;
    }
    phase = "dealer";
    setStatus("DEALER TURN");
    while (handValue(dealerHand) < 17) {
      dealerHand.push(drawCard());
    }
    updateHands(false);
    const dealerValue = handValue(dealerHand);
    const playerValue = handValue(playerHand);
    if (dealerValue > 21 || playerValue > dealerValue) {
      settleRound("player_win");
    } else if (dealerValue === playerValue) {
      settleRound("push");
    } else {
      settleRound("dealer_win");
    }
  }

  function addToBet(amount) {
    if (!(phase === "idle" || phase === "roundOver")) {
      return;
    }
    const bankroll = getBankroll(state);
    if (bankroll < amount) {
      setStatus("INSUFFICIENT BANKROLL");
      updateControls();
      return;
    }
    bet += amount;
    updateBankroll(bankroll - amount);
    updateBetDisplay();
    setStatus(`BET LOCKED $${formatMoney(bet)} :: PRESS DEAL`);
    updateControls();
  }

  function resetTable() {
    if (!(phase === "idle" || phase === "roundOver")) {
      return;
    }
    if (bet > 0) {
      const bankroll = getBankroll(state);
      updateBankroll(bankroll + bet);
    }
    bet = 0;
    dealerHand = [];
    playerHand = [];
    phase = "idle";
    updateBetDisplay();
    updateHands(true);
    setStatus("PLACE BETS THEN DEAL");
    updateControls();
  }

  for (let i = 0; i < chipButtons.length; i += 1) {
    const btn = chipButtons[i];
    btn.addEventListener("click", () => {
      addToBet(Number(btn.dataset.bet));
    });
  }

  dealBtn.addEventListener("click", startHand);
  hitBtn.addEventListener("click", hit);
  standBtn.addEventListener("click", stand);
  newHandBtn.addEventListener("click", resetTable);

  updateHands(true);
  updateBetDisplay();
  updateControls();

  return {
    startHand,
    hit,
    stand,
    setBet: addToBet,
    resetTable,
  };
}

window.BlackjackGame = Object.assign(window.BlackjackGame || {}, { initBlackjack });
