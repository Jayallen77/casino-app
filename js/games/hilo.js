(() => {
  const SUITS = ["S", "H", "D", "C"];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

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

  function renderCardHtml(card, hidden = false) {
    if (hidden) {
      const lines = [
        "+-----+",
        "|#####|",
        "|#####|",
        "|#####|",
        "+-----+",
      ];
      return `<span class=\"ascii-card\">${lines.join("<br>")}</span>`;
    }
    if (!card) {
      return "<span class=\"ascii-empty\">[no card]</span>";
    }
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

  function initHiLo({ rootEl, state }) {
    const { getBankroll, setBankroll } = window.CasinoState;
    const { formatSettlementMessage } = window.CasinoSettlement;

    const currentEl = rootEl.querySelector("#hilo-current");
    const nextEl = rootEl.querySelector("#hilo-next");
    const statusEl = rootEl.querySelector("#hilo-status");
    const streakEl = rootEl.querySelector("#hilo-streak");
    const betDisplay = rootEl.querySelector("#hilo-bet-display");
    const dealBtn = rootEl.querySelector("#hilo-deal");
    const highBtn = rootEl.querySelector("#hilo-high");
    const lowBtn = rootEl.querySelector("#hilo-low");
    const cashBtn = rootEl.querySelector("#hilo-cashout");
    const clearBtn = rootEl.querySelector("#hilo-clear");
    const chipButtons = rootEl.querySelectorAll(".hilo-chip");
    const bankrollEl = rootEl.querySelector("#bankroll");

    let deck = [];
    let currentCard = null;
    let nextCard = null;
    let bet = 0;
    let streak = 0;
    let phase = "idle"; // idle | dealt | resolving | roundOver

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

    function updateStreak() {
      if (streakEl) {
        streakEl.textContent = `STREAK: ${streak} :: MULTIPLIER X${1 + streak}`;
      }
    }

    function updateBetDisplay() {
      if (betDisplay) {
        betDisplay.textContent = `$${formatMoney(bet)}`;
      }
    }

    function updateCards(showNext = false) {
      if (currentEl) {
        currentEl.innerHTML = renderCardHtml(currentCard, false);
      }
      if (nextEl) {
        if (showNext && nextCard) {
          nextEl.innerHTML = renderCardHtml(nextCard, false);
        } else {
          nextEl.innerHTML = renderCardHtml(nextCard, true);
        }
      }
    }

    function updateControls() {
      const canAdjust = phase === "idle" || phase === "roundOver";
      const hasBet = bet > 0;
      if (dealBtn) {
        dealBtn.disabled = !canAdjust || !hasBet;
      }
      if (clearBtn) {
        clearBtn.disabled = !canAdjust || !hasBet;
      }
      if (highBtn) {
        highBtn.disabled = phase !== "dealt";
      }
      if (lowBtn) {
        lowBtn.disabled = phase !== "dealt";
      }
      if (cashBtn) {
        cashBtn.disabled = phase !== "dealt" || streak <= 0;
      }
      for (let i = 0; i < chipButtons.length; i += 1) {
        chipButtons[i].disabled = !canAdjust;
      }
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

    function settleRound({ label, cssClass, multiplier }) {
      const wager = bet;
      const payout = wager * multiplier;
      const net = payout - wager;
      if (payout > 0) {
        const bankroll = getBankroll(state);
        updateBankroll(bankroll + payout);
      }
      const payoutMessage = formatSettlementMessage({
        label,
        cssClass,
        wager,
        payout,
        net,
      });
      bet = 0;
      streak = 0;
      phase = "roundOver";
      updateBetDisplay();
      updateStreak();
      setStatus(`ROUND OVER :: ${payoutMessage} :: PLACE BETS THEN DEAL`);
      updateControls();
    }

    function deal() {
      if (!(phase === "idle" || phase === "roundOver")) {
        return;
      }
      if (bet <= 0) {
        setStatus("PLACE BETS THEN DEAL");
        updateControls();
        return;
      }
      freshDeck();
      currentCard = drawCard();
      nextCard = null;
      streak = 0;
      phase = "dealt";
      updateCards(false);
      updateStreak();
      setStatus("GUESS HIGH OR LOW");
      updateControls();
    }

    function resolveGuess(choice) {
      if (phase !== "dealt") {
        return;
      }
      phase = "resolving";
      updateControls();
      nextCard = drawCard();
      updateCards(true);

      const currentValue = rankValue(currentCard.rank);
      const nextValue = rankValue(nextCard.rank);

      if (nextValue === currentValue) {
        setStatus("TIE :: BET RETURNED");
        settleRound({ label: "PUSH", cssClass: "result-push", multiplier: 1 });
        return;
      }

      const isHigher = nextValue > currentValue;
      const correct = (choice === "high" && isHigher) || (choice === "low" && !isHigher);

      if (correct) {
        streak += 1;
        currentCard = nextCard;
        nextCard = null;
        phase = "dealt";
        updateCards(false);
        updateStreak();
        setStatus(`CORRECT :: STREAK ${streak} :: CASH OUT OR GUESS AGAIN`);
        updateControls();
        return;
      }

      setStatus("WRONG GUESS");
      settleRound({ label: "LOSS", cssClass: "result-loss", multiplier: 0 });
    }

    function cashOut() {
      if (phase !== "dealt" || streak <= 0) {
        return;
      }
      const multiplier = 1 + streak;
      setStatus("CASHING OUT");
      settleRound({ label: "CASH OUT", cssClass: "result-win", multiplier });
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

    function clearBet() {
      if (!(phase === "idle" || phase === "roundOver")) {
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

    for (let i = 0; i < chipButtons.length; i += 1) {
      const btn = chipButtons[i];
      btn.addEventListener("click", () => {
        addToBet(Number(btn.dataset.bet));
      });
    }

    if (dealBtn) {
      dealBtn.addEventListener("click", deal);
    }

    if (highBtn) {
      highBtn.addEventListener("click", () => resolveGuess("high"));
    }

    if (lowBtn) {
      lowBtn.addEventListener("click", () => resolveGuess("low"));
    }

    if (cashBtn) {
      cashBtn.addEventListener("click", cashOut);
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", clearBet);
    }

    updateCards(false);
    updateStreak();
    updateBetDisplay();
    updateControls();

    return {
      deal,
      resolveGuess,
      cashOut,
      clearBet,
    };
  }

  window.HiLoGame = Object.assign(window.HiLoGame || {}, { initHiLo });
})();
