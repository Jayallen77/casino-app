(() => {
  const SUITS = ["S", "H", "D", "C"];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  const PAYOUTS = {
    ROYAL_FLUSH: 250,
    STRAIGHT_FLUSH: 50,
    FOUR_KIND: 25,
    FULL_HOUSE: 9,
    FLUSH: 6,
    STRAIGHT: 4,
    THREE_KIND: 3,
    TWO_PAIR: 2,
    JACKS_OR_BETTER: 1,
    LOSS: 0,
  };

  function buildDeck() {
    const deck = [];
    for (let s = 0; s < SUITS.length; s += 1) {
      for (let r = 0; r < RANKS.length; r += 1) {
        deck.push({ rank: RANKS[r], suit: SUITS[s] });
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

  function rankValue(rank) {
    if (rank === "A") return 14;
    if (rank === "K") return 13;
    if (rank === "Q") return 12;
    if (rank === "J") return 11;
    return Number(rank);
  }

  function isStraight(values) {
    const unique = Array.from(new Set(values)).sort((a, b) => a - b);
    if (unique.length !== 5) return false;
    const highStraight = unique[4] - unique[0] === 4;
    const lowStraight = JSON.stringify(unique) === JSON.stringify([2, 3, 4, 5, 14]);
    return highStraight || lowStraight;
  }

  function evaluateHand(cards) {
    const values = cards.map((card) => rankValue(card.rank)).sort((a, b) => a - b);
    const suits = cards.map((card) => card.suit);
    const isFlush = suits.every((suit) => suit === suits[0]);
    const straight = isStraight(values);

    const counts = {};
    for (let i = 0; i < cards.length; i += 1) {
      const rank = cards[i].rank;
      counts[rank] = (counts[rank] || 0) + 1;
    }
    const countEntries = Object.entries(counts).map(([rank, count]) => ({
      rank,
      count,
      value: rankValue(rank),
    }));
    const countValues = countEntries.map((entry) => entry.count).sort((a, b) => b - a);

    if (isFlush && straight) {
      const isRoyal = values.includes(14) && values.includes(10);
      const hand = isRoyal ? "ROYAL_FLUSH" : "STRAIGHT_FLUSH";
      return { hand, multiplier: PAYOUTS[hand] };
    }
    if (countValues[0] === 4) {
      return { hand: "FOUR_KIND", multiplier: PAYOUTS.FOUR_KIND };
    }
    if (countValues[0] === 3 && countValues[1] === 2) {
      return { hand: "FULL_HOUSE", multiplier: PAYOUTS.FULL_HOUSE };
    }
    if (isFlush) {
      return { hand: "FLUSH", multiplier: PAYOUTS.FLUSH };
    }
    if (straight) {
      return { hand: "STRAIGHT", multiplier: PAYOUTS.STRAIGHT };
    }
    if (countValues[0] === 3) {
      return { hand: "THREE_KIND", multiplier: PAYOUTS.THREE_KIND };
    }
    if (countValues[0] === 2 && countValues[1] === 2) {
      return { hand: "TWO_PAIR", multiplier: PAYOUTS.TWO_PAIR };
    }
    if (countValues[0] === 2) {
      const pairEntry = countEntries.find((entry) => entry.count === 2);
      const pairValue = pairEntry ? pairEntry.value : 0;
      if (pairValue >= 11) {
        return { hand: "JACKS_OR_BETTER", multiplier: PAYOUTS.JACKS_OR_BETTER };
      }
    }

    return { hand: "LOSS", multiplier: PAYOUTS.LOSS };
  }

  function renderCardHtml(card) {
    const rank = card.rank;
    const padRight = " ".repeat(5 - rank.length);
    const padLeft = " ".repeat(5 - rank.length);
    const face = `<span class=\"card-face\">${rank}</span>`;
    const suit = `<span class=\"card-face\">${card.suit}</span>`;
    const lines = [
      "+-----+",
      `|${face}${padRight}|`,
      `|  ${suit}  |`,
      `|${padLeft}${face}|`,
      "+-----+",
    ];
    return `<span class=\"ascii-card\">${lines.join("<br>")}</span>`;
  }

  function formatMoney(amount) {
    if (Number.isInteger(amount)) {
      return String(amount);
    }
    return amount.toFixed(1);
  }

  function initVideoPoker({ rootEl, state }) {
    const { getBankroll, setBankroll } = window.CasinoState;
    const cardsEl = rootEl.querySelector("#vp-cards");
    const holdButtons = rootEl.querySelectorAll(".vp-hold");
    const statusEl = rootEl.querySelector("#vp-status");
    const betDisplay = rootEl.querySelector("#vp-bet-display");
    const dealBtn = rootEl.querySelector("#vp-deal");
    const clearBtn = rootEl.querySelector("#vp-clear");
    const chipButtons = rootEl.querySelectorAll(".vp-chip");
    const bankrollEl = rootEl.querySelector("#bankroll");

    let deck = [];
    let hand = [];
    let holds = [false, false, false, false, false];
    let bet = 0;
    let phase = "idle"; // idle | dealt | resolving

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
      if (statusEl) {
        statusEl.innerHTML = message;
      }
    }

    function updateBetDisplay() {
      if (betDisplay) {
        betDisplay.textContent = `$${formatMoney(bet)}`;
      }
    }

    function updateControls() {
      const hasBet = bet > 0;
      if (dealBtn) {
        dealBtn.disabled = phase === "resolving" || (phase === "idle" && !hasBet);
        dealBtn.textContent = phase === "dealt" ? "DRAW" : "DEAL";
      }
      if (clearBtn) {
        clearBtn.disabled = phase !== "idle" || !hasBet;
      }
      for (let i = 0; i < chipButtons.length; i += 1) {
        chipButtons[i].disabled = phase !== "idle";
      }
      for (let i = 0; i < holdButtons.length; i += 1) {
        holdButtons[i].disabled = phase !== "dealt";
        holdButtons[i].classList.toggle("active", holds[i]);
      }
    }

    function updateCards() {
      if (!cardsEl) return;
      cardsEl.innerHTML = hand.length
        ? hand.map((card, index) => {
            const holdClass = holds[index] ? "vp-card hold" : "vp-card";
            return `<div class=\"${holdClass}\">${renderCardHtml(card)}</div>`;
          }).join("")
        : "<div class=\"vp-card\">[no hand]</div>".repeat(5);
    }

    function drawCard() {
      if (!deck.length) {
        deck = shuffle(buildDeck());
      }
      return deck.pop();
    }

    function resetHand() {
      hand = [];
      holds = [false, false, false, false, false];
      phase = "idle";
      updateCards();
      updateControls();
    }

    function clearBet() {
      if (phase !== "idle") {
        return;
      }
      if (bet > 0) {
        const bankroll = getBankroll(state);
        updateBankroll(bankroll + bet);
      }
      bet = 0;
      updateBetDisplay();
      setStatus("PLACE BETS THEN DEAL");
      updateControls();
    }

    function addToBet(amount) {
      if (phase !== "idle") {
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

    function deal() {
      if (phase === "resolving") {
        return;
      }
      if (phase === "idle") {
        if (bet <= 0) {
          setStatus("PLACE BETS THEN DEAL");
          return;
        }
        deck = shuffle(buildDeck());
        hand = [drawCard(), drawCard(), drawCard(), drawCard(), drawCard()];
        holds = [false, false, false, false, false];
        phase = "dealt";
        setStatus("SELECT HOLDS THEN DRAW");
        updateCards();
        updateControls();
        return;
      }

      if (phase === "dealt") {
        phase = "resolving";
        updateControls();
        for (let i = 0; i < hand.length; i += 1) {
          if (!holds[i]) {
            hand[i] = drawCard();
          }
        }
        const result = evaluateHand(hand);
        if (result.multiplier > 0) {
          const payout = result.multiplier * bet;
          const bankroll = getBankroll(state);
          updateBankroll(bankroll + payout);
          const label = result.hand.replace(/_/g, " ");
          setStatus(`ROUND OVER :: <span class=\"result-win\">${label}</span> +$${formatMoney(payout - bet)}`);
        } else {
          setStatus("ROUND OVER :: <span class=\"result-loss\">LOSS</span> :: PLACE BETS THEN DEAL");
        }
        bet = 0;
        updateBetDisplay();
        updateCards();
        phase = "idle";
        updateControls();
      }
    }

    for (let i = 0; i < chipButtons.length; i += 1) {
      chipButtons[i].addEventListener("click", () => {
        addToBet(Number(chipButtons[i].dataset.bet));
      });
    }

    for (let i = 0; i < holdButtons.length; i += 1) {
      holdButtons[i].addEventListener("click", () => {
        if (phase !== "dealt") return;
        holds[i] = !holds[i];
        updateCards();
        updateControls();
      });
    }

    if (dealBtn) {
      dealBtn.addEventListener("click", deal);
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", clearBet);
    }

    resetHand();
    updateBetDisplay();
    setStatus("PLACE BETS THEN DEAL");

    return {
      deal,
      clearBet,
    };
  }

  window.VideoPokerGame = Object.assign(window.VideoPokerGame || {}, { initVideoPoker });

  function runVideoPokerTests() {
    if (typeof console === "undefined" || typeof console.assert !== "function") {
      return;
    }
    const c = (rank, suit) => ({ rank, suit });
    const tests = [
      {
        name: "Royal Flush",
        cards: [c("A", "S"), c("K", "S"), c("Q", "S"), c("J", "S"), c("10", "S")],
        hand: "ROYAL_FLUSH",
        multiplier: 250,
      },
      {
        name: "Straight Flush",
        cards: [c("9", "H"), c("8", "H"), c("7", "H"), c("6", "H"), c("5", "H")],
        hand: "STRAIGHT_FLUSH",
        multiplier: 50,
      },
      {
        name: "Four of a Kind",
        cards: [c("9", "C"), c("9", "D"), c("9", "H"), c("9", "S"), c("2", "H")],
        hand: "FOUR_KIND",
        multiplier: 25,
      },
      {
        name: "Full House",
        cards: [c("K", "C"), c("K", "D"), c("K", "H"), c("3", "S"), c("3", "H")],
        hand: "FULL_HOUSE",
        multiplier: 9,
      },
      {
        name: "Flush Only",
        cards: [c("A", "D"), c("10", "D"), c("8", "D"), c("3", "D"), c("2", "D")],
        hand: "FLUSH",
        multiplier: 6,
      },
      {
        name: "Straight Only (A-2-3-4-5)",
        cards: [c("A", "C"), c("2", "D"), c("3", "H"), c("4", "S"), c("5", "C")],
        hand: "STRAIGHT",
        multiplier: 4,
      },
      {
        name: "Three of a Kind",
        cards: [c("7", "C"), c("7", "D"), c("7", "H"), c("4", "S"), c("2", "H")],
        hand: "THREE_KIND",
        multiplier: 3,
      },
      {
        name: "Two Pair",
        cards: [c("J", "C"), c("J", "D"), c("4", "H"), c("4", "S"), c("9", "H")],
        hand: "TWO_PAIR",
        multiplier: 2,
      },
      {
        name: "Pair of 10s (Loss)",
        cards: [c("10", "C"), c("10", "D"), c("4", "H"), c("7", "S"), c("2", "H")],
        hand: "LOSS",
        multiplier: 0,
      },
      {
        name: "Pair of Jacks (Jacks or Better)",
        cards: [c("J", "C"), c("J", "D"), c("3", "H"), c("5", "S"), c("9", "H")],
        hand: "JACKS_OR_BETTER",
        multiplier: 1,
      },
      {
        name: "High Card Only (Loss)",
        cards: [c("A", "C"), c("K", "D"), c("9", "H"), c("5", "S"), c("2", "H")],
        hand: "LOSS",
        multiplier: 0,
      },
    ];

    for (let i = 0; i < tests.length; i += 1) {
      const test = tests[i];
      const result = evaluateHand(test.cards);
      console.assert(
        result.hand === test.hand && result.multiplier === test.multiplier,
        `[Video Poker] ${test.name} failed: expected ${test.hand} x${test.multiplier}, got ${result.hand} x${result.multiplier}`
      );
    }
  }

  runVideoPokerTests();
})();
