(() => {
  const SUITS = ["S", "H", "D", "C"];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  const PAYOUTS = {
    royal_flush: 250,
    straight_flush: 50,
    four_kind: 25,
    full_house: 9,
    flush: 6,
    straight: 4,
    three_kind: 3,
    two_pair: 2,
    jacks_better: 1,
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
    const counts = {};
    for (let i = 0; i < values.length; i += 1) {
      counts[values[i]] = (counts[values[i]] || 0) + 1;
    }
    const countValues = Object.values(counts).sort((a, b) => b - a);
    const isFlush = suits.every((suit) => suit === suits[0]);
    const straight = isStraight(values);

    if (isFlush && straight) {
      const isRoyal = values.includes(14) && values.includes(10);
      return isRoyal ? { name: "ROYAL FLUSH", key: "royal_flush" } : { name: "STRAIGHT FLUSH", key: "straight_flush" };
    }
    if (countValues[0] === 4) {
      return { name: "FOUR OF A KIND", key: "four_kind" };
    }
    if (countValues[0] === 3 && countValues[1] === 2) {
      return { name: "FULL HOUSE", key: "full_house" };
    }
    if (isFlush) {
      return { name: "FLUSH", key: "flush" };
    }
    if (straight) {
      return { name: "STRAIGHT", key: "straight" };
    }
    if (countValues[0] === 3) {
      return { name: "THREE OF A KIND", key: "three_kind" };
    }
    if (countValues[0] === 2 && countValues[1] === 2) {
      return { name: "TWO PAIR", key: "two_pair" };
    }
    if (countValues[0] === 2) {
      const pairRank = Number(Object.keys(counts).find((key) => counts[key] === 2));
      if (pairRank >= 11 || pairRank === 14) {
        return { name: "JACKS OR BETTER", key: "jacks_better" };
      }
    }

    return { name: "NO WIN", key: null };
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
        if (result.key) {
          const payout = PAYOUTS[result.key] * bet;
          const bankroll = getBankroll(state);
          updateBankroll(bankroll + payout);
          setStatus(`ROUND OVER :: <span class=\"result-win\">${result.name}</span> +$${formatMoney(payout - bet)}`);
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
})();
