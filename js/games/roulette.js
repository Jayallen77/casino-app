(() => {
  const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

  function formatMoney(amount) {
    if (Number.isInteger(amount)) {
      return String(amount);
    }
    return amount.toFixed(1);
  }

  function initRoulette({ rootEl, state }) {
    const { getBankroll, setBankroll } = window.CasinoState;
    const { formatSettlementMessage } = window.CasinoSettlement;

    const gridEl = rootEl.querySelector("#roulette-grid");
    const statusEl = rootEl.querySelector("#roulette-status");
    const resultEl = rootEl.querySelector("#roulette-result");
    const chipDisplayEl = rootEl.querySelector("#roulette-chip-display");
    const betTotalEl = rootEl.querySelector("#roulette-bet-total");
    const betsEl = rootEl.querySelector("#roulette-bets");
    const spinBtn = rootEl.querySelector("#roulette-spin");
    const clearBtn = rootEl.querySelector("#roulette-clear");
    const chipButtons = rootEl.querySelectorAll(".roulette-chip");
    const bankrollEl = rootEl.querySelector("#bankroll");

    let bets = {};
    let activeChip = 5;
    let spinning = false;
    let spinTimer = null;

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

    function setResult(number) {
      if (!resultEl) return;
      if (number === null || number === undefined) {
        resultEl.textContent = "RESULT: --";
        return;
      }
      let colorClass = "roulette-result-green";
      let colorLabel = "GREEN";
      if (number !== 0) {
        if (RED_NUMBERS.has(number)) {
          colorClass = "roulette-result-red";
          colorLabel = "RED";
        } else if (BLACK_NUMBERS.has(number)) {
          colorClass = "roulette-result-black";
          colorLabel = "BLACK";
        }
      }
      resultEl.innerHTML = `RESULT: <span class=\"roulette-result-number ${colorClass}\">${number}</span> <span class=\"${colorClass}\">${colorLabel}</span>`;
    }

    function updateBetDisplay() {
      const total = Object.values(bets).reduce((sum, amount) => sum + amount, 0);
      if (betTotalEl) {
        betTotalEl.textContent = `$${formatMoney(total)}`;
      }
      if (chipDisplayEl) {
        chipDisplayEl.textContent = `$${formatMoney(activeChip)}`;
      }
      if (betsEl) {
        const entries = Object.keys(bets)
          .map((key) => {
            const amount = bets[key];
            let label = key;
            if (key.startsWith("straight:")) {
              label = key.split(":")[1];
            } else if (key === "dozen1") {
              label = "1st12";
            } else if (key === "dozen2") {
              label = "2nd12";
            } else if (key === "dozen3") {
              label = "3rd12";
            } else if (key === "low") {
              label = "1-18";
            } else if (key === "high") {
              label = "19-36";
            } else {
              label = key.toUpperCase();
            }
            return `${label} $${formatMoney(amount)}`;
          });
        betsEl.textContent = entries.length ? `BETS: ${entries.join(", ")}` : "BETS: [none]";
      }

      const betButtons = rootEl.querySelectorAll(".roulette-bet");
      for (let i = 0; i < betButtons.length; i += 1) {
        const btn = betButtons[i];
        const key = btn.dataset.bet || "";
        btn.classList.toggle("active", Boolean(bets[key]));
      }
    }

    function updateControls() {
      const total = Object.values(bets).reduce((sum, amount) => sum + amount, 0);
      if (spinBtn) {
        spinBtn.disabled = spinning || total <= 0;
      }
      if (clearBtn) {
        clearBtn.disabled = spinning || total <= 0;
      }
      for (let i = 0; i < chipButtons.length; i += 1) {
        chipButtons[i].disabled = spinning;
      }
      const betButtons = rootEl.querySelectorAll(".roulette-bet");
      for (let i = 0; i < betButtons.length; i += 1) {
        betButtons[i].disabled = spinning;
      }
    }

    function buildGrid() {
      if (!gridEl) return;
      gridEl.innerHTML = "";
      const zeroBtn = document.createElement("button");
      zeroBtn.className = "btn roulette-bet roulette-zero";
      zeroBtn.dataset.bet = "straight:0";
      zeroBtn.textContent = "0";
      gridEl.appendChild(zeroBtn);

      for (let i = 1; i <= 36; i += 1) {
        const btn = document.createElement("button");
        btn.className = "btn roulette-bet";
        btn.dataset.bet = `straight:${i}`;
        btn.textContent = String(i);
        gridEl.appendChild(btn);
      }
    }

    function placeBet(key) {
      if (spinning) return;
      const bankroll = getBankroll(state);
      if (bankroll < activeChip) {
        setStatus("INSUFFICIENT BANKROLL");
        updateControls();
        return;
      }
      bets[key] = (bets[key] || 0) + activeChip;
      updateBankroll(bankroll - activeChip);
      setStatus(`BET ADDED $${formatMoney(activeChip)} :: PRESS SPIN`);
      updateBetDisplay();
      updateControls();
    }

    function clearBets() {
      if (spinning) return;
      const total = Object.values(bets).reduce((sum, amount) => sum + amount, 0);
      if (total > 0) {
        const bankroll = getBankroll(state);
        updateBankroll(bankroll + total);
      }
      bets = {};
      setStatus("PLACE BETS THEN SPIN");
      updateBetDisplay();
      updateControls();
    }

    function evaluateBets(resultNumber) {
      let payoutSum = 0;
      const keys = Object.keys(bets);
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        const amount = bets[key];
        if (key.startsWith("straight:")) {
          const value = Number(key.split(":")[1]);
          if (value === resultNumber) {
            payoutSum += amount * 36;
          }
          continue;
        }
        if (resultNumber === 0) {
          continue;
        }
        if (key === "red" && RED_NUMBERS.has(resultNumber)) {
          payoutSum += amount * 2;
        } else if (key === "black" && BLACK_NUMBERS.has(resultNumber)) {
          payoutSum += amount * 2;
        } else if (key === "odd" && resultNumber % 2 === 1) {
          payoutSum += amount * 2;
        } else if (key === "even" && resultNumber % 2 === 0) {
          payoutSum += amount * 2;
        } else if (key === "low" && resultNumber >= 1 && resultNumber <= 18) {
          payoutSum += amount * 2;
        } else if (key === "high" && resultNumber >= 19 && resultNumber <= 36) {
          payoutSum += amount * 2;
        } else if (key === "dozen1" && resultNumber >= 1 && resultNumber <= 12) {
          payoutSum += amount * 3;
        } else if (key === "dozen2" && resultNumber >= 13 && resultNumber <= 24) {
          payoutSum += amount * 3;
        } else if (key === "dozen3" && resultNumber >= 25 && resultNumber <= 36) {
          payoutSum += amount * 3;
        }
      }
      return payoutSum;
    }

    function spin() {
      if (spinning) return;
      const totalBet = Object.values(bets).reduce((sum, amount) => sum + amount, 0);
      if (totalBet <= 0) {
        setStatus("PLACE BETS THEN SPIN");
        return;
      }
      spinning = true;
      updateControls();
      setStatus("SPINNING...");

      const duration = 1200 + Math.floor(Math.random() * 600);
      const tick = 60 + Math.floor(Math.random() * 30);
      let current = 0;

      if (spinTimer) {
        clearInterval(spinTimer);
      }

      spinTimer = setInterval(() => {
        current = Math.floor(Math.random() * 37);
        setResult(current);
      }, tick);

      setTimeout(() => {
        if (spinTimer) {
          clearInterval(spinTimer);
        }
        const finalNumber = Math.floor(Math.random() * 37);
        setResult(finalNumber);

        const payoutSum = evaluateBets(finalNumber);
        const net = payoutSum - totalBet;
        let label = "PUSH";
        let cssClass = "result-push";
        if (net > 0) {
          label = "WIN";
          cssClass = "result-win";
        } else if (net < 0) {
          label = "LOSS";
          cssClass = "result-loss";
        }

        if (payoutSum > 0) {
          const bankroll = getBankroll(state);
          updateBankroll(bankroll + payoutSum);
        }

        const payoutMessage = formatSettlementMessage({
          label,
          cssClass,
          wager: totalBet,
          payout: payoutSum,
          net,
        });
        setStatus(`ROUND OVER :: ${payoutMessage} :: PLACE BETS THEN SPIN`);

        bets = {};
        spinning = false;
        updateBetDisplay();
        updateControls();
      }, duration);
    }

    for (let i = 0; i < chipButtons.length; i += 1) {
      const btn = chipButtons[i];
      btn.addEventListener("click", () => {
        if (spinning) return;
        activeChip = Number(btn.dataset.bet);
        for (let j = 0; j < chipButtons.length; j += 1) {
          chipButtons[j].classList.toggle("active", chipButtons[j] === btn);
        }
        updateBetDisplay();
      });
    }

    rootEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.classList.contains("roulette-bet")) {
        const key = target.dataset.bet;
        if (key) {
          placeBet(key);
        }
      }
    });

    if (spinBtn) {
      spinBtn.addEventListener("click", spin);
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", clearBets);
    }

    buildGrid();
    setResult(null);
    updateBetDisplay();
    updateControls();

    return {
      spin,
      clearBets,
    };
  }

  window.RouletteGame = Object.assign(window.RouletteGame || {}, { initRoulette });
})();
