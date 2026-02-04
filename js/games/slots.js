(() => {
  const SYMBOLS = [
    { char: "7", weight: 1 },
    { char: "B", weight: 2 },
    { char: "X", weight: 3 },
    { char: "*", weight: 2 },
    { char: "$", weight: 6 },
  ];

  function pickSymbol() {
    const total = SYMBOLS.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < SYMBOLS.length; i += 1) {
      roll -= SYMBOLS[i].weight;
      if (roll <= 0) {
        return SYMBOLS[i].char;
      }
    }
    return SYMBOLS[0].char;
  }

  function formatMoney(amount) {
    if (Number.isInteger(amount)) {
      return String(amount);
    }
    return amount.toFixed(1);
  }

  function initSlots({ rootEl, state }) {
    const { getBankroll, setBankroll } = window.CasinoState;
    const reelsEl = rootEl.querySelector("#slots-reels");
    const reelEls = reelsEl ? reelsEl.querySelectorAll(".slot-reel") : [];
    const statusEl = rootEl.querySelector("#slots-status");
    const betDisplay = rootEl.querySelector("#slots-bet-display");
    const spinBtn = rootEl.querySelector("#slots-spin");
    const clearBtn = rootEl.querySelector("#slots-clear");
    const chipButtons = rootEl.querySelectorAll(".slot-chip");
    const bankrollEl = rootEl.querySelector("#bankroll");

    let bet = 0;
    let spinning = false;
    let spinTimeouts = [];

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
      if (spinBtn) {
        spinBtn.disabled = spinning || !hasBet;
      }
      if (clearBtn) {
        clearBtn.disabled = spinning || !hasBet;
      }
      for (let i = 0; i < chipButtons.length; i += 1) {
        chipButtons[i].disabled = spinning;
      }
    }

    function setReelSymbol(index, symbol) {
      if (reelEls[index]) {
        reelEls[index].textContent = `[▓ ${symbol} ▓]`;
      }
    }

    function seedReels() {
      for (let i = 0; i < reelEls.length; i += 1) {
        setReelSymbol(i, pickSymbol());
      }
    }

    function clearBet() {
      if (spinning) {
        return;
      }
      if (bet > 0) {
        const bankroll = getBankroll(state);
        updateBankroll(bankroll + bet);
      }
      bet = 0;
      updateBetDisplay();
      setStatus("PLACE BETS THEN SPIN");
      updateControls();
    }

    function addToBet(amount) {
      if (spinning) {
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
      setStatus(`BET LOCKED $${formatMoney(bet)} :: PRESS SPIN`);
      updateControls();
    }

    function stopAllSpins() {
      spinTimeouts.forEach((id) => clearTimeout(id));
      spinTimeouts = [];
    }

    function finishSpin(finalSymbols) {
      spinning = false;
      let payoutMultiplier = 0;
      const [a, b, c] = finalSymbols;
      if (a === b && b === c) {
        payoutMultiplier = 5;
      } else if (a === b || a === c || b === c) {
        payoutMultiplier = 2;
      }

      if (payoutMultiplier > 0) {
        const winnings = bet * payoutMultiplier;
        const bankroll = getBankroll(state);
        updateBankroll(bankroll + winnings);
        setStatus(`ROUND OVER :: <span class=\"result-win\">WIN</span> +$${formatMoney(winnings - bet)}`);
      } else {
        setStatus("ROUND OVER :: <span class=\"result-loss\">LOSS</span> :: PLACE BETS THEN SPIN");
      }

      bet = 0;
      updateBetDisplay();
      updateControls();
    }

    function spin() {
      if (spinning || bet <= 0) {
        return;
      }
      spinning = true;
      setStatus("SPINNING...");
      updateControls();

      const stopTimes = [650, 1050, 1500];
      const finalSymbols = [null, null, null];

      stopAllSpins();

      function spinReel(index, duration) {
        const start = typeof performance !== "undefined" ? performance.now() : Date.now();
        const minDelay = 40;
        const maxDelay = 140;
        let snapDone = false;

        function tick() {
          const now = typeof performance !== "undefined" ? performance.now() : Date.now();
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = progress * progress;
          const delay = minDelay + (maxDelay - minDelay) * eased;

          if (!snapDone && progress >= 0.88) {
            snapDone = true;
            const rapidCount = 6;
            for (let j = 0; j < rapidCount; j += 1) {
              spinTimeouts.push(
                setTimeout(() => {
                  setReelSymbol(index, pickSymbol());
                }, j * 18)
              );
            }
          } else {
            setReelSymbol(index, pickSymbol());
          }

          if (progress < 1) {
            spinTimeouts.push(setTimeout(tick, delay));
            return;
          }

          if (snapDone) {
            const snapDelay = 120;
            spinTimeouts.push(
              setTimeout(() => {
                finalSymbols[index] = pickSymbol();
                setReelSymbol(index, finalSymbols[index]);
                if (finalSymbols.every((val) => val)) {
                  finishSpin(finalSymbols);
                }
              }, snapDelay)
            );
            return;
          }

          finalSymbols[index] = pickSymbol();
          setReelSymbol(index, finalSymbols[index]);
          if (finalSymbols.every((val) => val)) {
            finishSpin(finalSymbols);
          }
        }

        tick();
      }

      for (let i = 0; i < reelEls.length; i += 1) {
        spinReel(i, stopTimes[i]);
      }
    }

    for (let i = 0; i < chipButtons.length; i += 1) {
      const btn = chipButtons[i];
      btn.addEventListener("click", () => {
        addToBet(Number(btn.dataset.bet));
      });
    }

    if (spinBtn) {
      spinBtn.addEventListener("click", spin);
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", clearBet);
    }

    seedReels();
    updateBetDisplay();
    updateControls();

    return {
      spin,
      clearBet,
    };
  }

  window.SlotsGame = Object.assign(window.SlotsGame || {}, { initSlots });
})();
