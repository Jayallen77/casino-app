const { loadState, getBankroll, getLeaderboard } = window.CasinoState;

const state = loadState();

const bankrollEl = document.querySelector("#bankroll");
const leaderboardEl = document.querySelector("#leaderboard");

function formatMoney(amount) {
  if (Number.isInteger(amount)) {
    return String(amount);
  }
  return amount.toFixed(1);
}

function updateBankroll() {
  bankrollEl.textContent = `$${formatMoney(getBankroll(state))}`;
}

function formatLeaderboard(entries) {
  if (!entries.length) {
    return "[no scores yet]";
  }
  const lines = ["RANK  NAME            SCORE  MSG", "---------------------------------"];
  entries.forEach((entry, index) => {
    const rank = String(index + 1).padEnd(5, " ");
    const name = (entry.name || "anon").padEnd(15, " ").slice(0, 15);
    const score = formatMoney(entry.score).padEnd(6, " ");
    const emoji = entry.emoji || "";
    lines.push(`${rank}${name}${score} ${emoji}`);
  });
  return lines.join("\n");
}

function updateLeaderboard() {
  leaderboardEl.textContent = formatLeaderboard(getLeaderboard(state));
}

updateBankroll();
updateLeaderboard();

document.addEventListener("bankroll:change", updateBankroll);
