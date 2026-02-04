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

    if (payout > 0 && net === 0) {
      return `${labelHtml} :: BET RETURNED :: WAGER ${wagerText} :: PAYOUT ${payoutText}`;
    }

    if (payout > 0) {
      const netText = `+$${formatMoney(net)}`;
      return `${labelHtml} :: WAGER ${wagerText} :: PAYOUT ${payoutText} :: NET ${netText}`;
    }

    return `${labelHtml} :: WAGER ${wagerText}`;
  }

  window.CasinoSettlement = Object.assign(window.CasinoSettlement || {}, {
    computeSettlement,
    formatSettlementMessage,
  });
})();
