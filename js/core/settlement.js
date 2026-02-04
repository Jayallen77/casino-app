(() => {
  function formatMoney(amount) {
    if (Number.isInteger(amount)) {
      return String(amount);
    }
    return amount.toFixed(1);
  }

  function computeSettlement({ wager, multiplier }) {
    const payout = wager * multiplier;
    const net = payout - wager;
    return {
      wager,
      payout,
      net,
      multiplier,
    };
  }

  function formatSettlementMessage({ label, cssClass, wager, payout, net }) {
    const wagerText = `$${formatMoney(wager)}`;
    const payoutText = `$${formatMoney(payout)}`;
    const labelHtml = `<span class="${cssClass}">${label}</span>`;
    let netClass = "net-push";
    let netText = `$${formatMoney(0)}`;

    if (net > 0) {
      netClass = "net-win";
      netText = `+$${formatMoney(net)}`;
    } else if (net < 0) {
      netClass = "net-loss";
      netText = `-$${formatMoney(Math.abs(net))}`;
    }
    const netHtml = `<span class="${netClass}">${netText}</span>`;
    const parts = [labelHtml];

    if (payout > 0 && net === 0) {
      parts.push("BET RETURNED");
    }

    parts.push(`WAGER ${wagerText}`);
    parts.push(`PAYOUT ${payoutText}`);
    parts.push(`NET ${netHtml}`);

    return parts.join(" :: ");
  }

  window.CasinoSettlement = Object.assign(window.CasinoSettlement || {}, {
    computeSettlement,
    formatSettlementMessage,
  });
})();
