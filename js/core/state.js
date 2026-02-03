(() => {
  const STORAGE_KEY = "casino_state_v1";
  const DEFAULT_BANKROLL = 1000;

  const defaultState = {
    bankroll: DEFAULT_BANKROLL,
    seeded: false,
    username: "",
    emoji: "",
    leaderboard: [],
    leaderboardWeekId: "",
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getWeekId(date = new Date()) {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
    return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }

  function loadState() {
    let state = clone(defaultState);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = { ...state, ...parsed };
      }
    } catch (err) {
      console.warn("Failed to load state", err);
    }

    const currentWeek = getWeekId();
    if (state.leaderboardWeekId !== currentWeek) {
      state.leaderboard = [];
      state.leaderboardWeekId = currentWeek;
    }

    if (typeof state.bankroll !== "number" || Number.isNaN(state.bankroll)) {
      state.bankroll = DEFAULT_BANKROLL;
    }

    if (state.seeded !== true) {
      if (state.bankroll <= 0) {
        state.bankroll = DEFAULT_BANKROLL;
      }
      state.seeded = true;
    }

    saveState(state);
    return state;
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Failed to save state", err);
    }
  }

  function getBankroll(state) {
    return state.bankroll;
  }

  function setBankroll(state, amount) {
    const rounded = Math.round(amount * 10) / 10;
    state.bankroll = Math.max(0, rounded);
    saveState(state);
  }

  function getLeaderboard(state) {
    return state.leaderboard || [];
  }

  function addLeaderboardEntry(state, entry) {
    const next = [...getLeaderboard(state), entry]
      .sort((a, b) => b.score - a.score || b.ts - a.ts)
      .slice(0, 10);
    state.leaderboard = next;
    saveState(state);
    return next;
  }

  function getIdentity(state) {
    return {
      name: state.username || "",
      emoji: state.emoji || "",
    };
  }

  function setIdentity(state, { name, emoji }) {
    state.username = name || "";
    state.emoji = emoji || "";
    saveState(state);
  }

  const api = {
    loadState,
    saveState,
    getBankroll,
    setBankroll,
    getLeaderboard,
    addLeaderboardEntry,
    getIdentity,
    setIdentity,
    getWeekId,
  };

  window.CasinoState = Object.assign(window.CasinoState || {}, api);
})();
