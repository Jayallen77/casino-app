(() => {
  const casinoState = window.CasinoState;
  const blackjackApi = window.BlackjackGame;
  const slotsApi = window.SlotsGame;
  const videoPokerApi = window.VideoPokerGame;
  const rouletteApi = window.RouletteGame;
  const hiloApi = window.HiLoGame;
  const statusEl = document.querySelector("#round-status");

  if (!casinoState || !blackjackApi || !slotsApi || !videoPokerApi || !rouletteApi || !hiloApi) {
    if (statusEl) {
      statusEl.textContent = "ERROR LOADING GAME FILES";
    }
    return;
  }

  const {
    loadState,
    getBankroll,
    addLeaderboardEntry,
    getIdentity,
    setIdentity,
  } = casinoState;
  const { initBlackjack } = blackjackApi;
  const { initSlots } = slotsApi;
  const { initVideoPoker } = videoPokerApi;
  const { initRoulette } = rouletteApi;
  const { initHiLo } = hiloApi;

  const state = loadState();

  const bankrollEl = document.querySelector("#bankroll");
  const saveScoreBtn = document.querySelector("#save-score");
  const modal = document.querySelector("#modal");
  const modalCancel = document.querySelector("#modal-cancel");
  const modalSave = document.querySelector("#modal-save");
  const usernameInput = document.querySelector("#username");
  const emojiInput = document.querySelector("#emoji");
  const modalStatus = document.querySelector("#modal-status");

  function formatMoney(amount) {
    if (Number.isInteger(amount)) {
      return String(amount);
    }
    return amount.toFixed(1);
  }

  function updateBankroll() {
    bankrollEl.textContent = `$${formatMoney(getBankroll(state))}`;
  }

  function openModal() {
    modal.classList.remove("hidden");
    const identity = getIdentity(state);
    usernameInput.value = identity.name || "";
    emojiInput.value = identity.emoji || "";
    modalStatus.textContent = "";
    usernameInput.focus();
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  function handleSaveScore() {
    const name = usernameInput.value.trim() || "anon";
    const emoji = emojiInput.value.trim();
    setIdentity(state, { name, emoji });

    const entry = {
      name,
      emoji,
      score: getBankroll(state),
      ts: Date.now(),
    };
    addLeaderboardEntry(state, entry);
    modalStatus.textContent = "SCORE SAVED";
    setTimeout(closeModal, 400);
  }

  saveScoreBtn.addEventListener("click", openModal);
  modalCancel.addEventListener("click", closeModal);
  modalSave.addEventListener("click", handleSaveScore);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  initBlackjack({ rootEl: document, state });
  initSlots({ rootEl: document, state });
  initVideoPoker({ rootEl: document, state });
  initRoulette({ rootEl: document, state });
  initHiLo({ rootEl: document, state });

  updateBankroll();

  document.addEventListener("bankroll:change", updateBankroll);
})();
