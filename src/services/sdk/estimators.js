import BigNumber from "bignumber.js";

export const daysInGregorianCalendar = new BigNumber(365.2524);

export function calculateDurationY(
  dateFrom,
  dateTo,
  daysInYear = daysInGregorianCalendar
) {
  const msInYear = daysInYear.times(24 * 60 * 60 * 1000);
  const durationMs = dateTo.getTime() - dateFrom.getTime();
  return BigNumber(durationMs).div(msInYear);
}

export function calculateAPY(
  firstPoolState,
  lastPoolState,
  daysInYear = daysInGregorianCalendar
) {
  if (!firstPoolState || !lastPoolState) return new BigNumber(0);

  const durationY = calculateDurationY(
    new Date(firstPoolState.timestamp),
    new Date(lastPoolState.timestamp),
    daysInYear
  );

  const fillNan = (price) => {
    const p = new BigNumber(price);
    return p.isNaN() ? BigNumber(1) : p;
  };

  const firstSharePrice = fillNan(firstPoolState.sharePrice);
  const lastSharePrice = fillNan(lastPoolState.sharePrice);
  const priceDynamics = lastSharePrice.div(firstSharePrice);

  const frequencyY = durationY.eq(0) ? BigNumber(0) : BigNumber(1).div(durationY);

  const annualDynamics = new BigNumber(
    Math.pow(priceDynamics.toNumber(), frequencyY.toNumber())
  );
  return annualDynamics.minus(1);
}

export function calculateMean(values) {
  if (!values.length) return new BigNumber(0);
  const sum = values.reduce(
    (acc, value) => acc.plus(new BigNumber(value)),
    new BigNumber(0)
  );
  return sum.div(values.length);
}

export function calculateVariation(values) {
  if (!values.length) return new BigNumber(0);
  const mean = calculateMean(values);
  const squareDifferences = values.map((value) => {
    const difference = new BigNumber(value).minus(mean);
    return difference.times(difference);
  });
  return calculateMean(squareDifferences);
}

export function calculateRiskIndex(events) {
  const dynamics = events
    .filter(e => e.provided && e.result && !new BigNumber(e.result).isZero())
    .map(e => new BigNumber(e.provided).div(new BigNumber(e.result)));

  if (!dynamics.length) return new BigNumber(0);

  const variation = calculateVariation(dynamics);
  const mean = calculateMean(dynamics);
  if (mean.isZero()) return new BigNumber(0);
  
  return variation.sqrt().div(mean);
}

export function calculateUtilization(events) {
  const utilizations = events
    .filter(e => e.totalBetsAmount && e.totalLiquidityProvided && !new BigNumber(e.totalLiquidityProvided).isZero())
    .map(e => new BigNumber(e.totalBetsAmount).div(new BigNumber(e.totalLiquidityProvided)));

  if (!utilizations.length) return new BigNumber(0);
  return calculateMean(utilizations);
}

export function makeSummaryPosition(position, lastPoolState) {
    if (!position || !lastPoolState) return {};

    const shares = new BigNumber(position.shares);
    const sharePrice = new BigNumber(lastPoolState.sharePrice);
    const withdrawnAmount = new BigNumber(position.withdrawnAmount);
    const depositedAmount = new BigNumber(position.depositedAmount);
    const realizedProfit = new BigNumber(position.realizedProfit);
    const lockedEstimateAmount = new BigNumber(position.lockedEstimateAmount);

    const estimatedPositionsValue = shares.times(sharePrice);
    const unrealizedProfit = estimatedPositionsValue
      .plus(withdrawnAmount)
      .minus(depositedAmount)
      .minus(realizedProfit)
      .plus(lockedEstimateAmount);

    return {
      totalDeposited: depositedAmount,
      entrySharePrice: new BigNumber(position.entrySharePrice),
      currentSharePrice: sharePrice,
      activeShares: shares,
      estimatedPositionsValue: estimatedPositionsValue,
      withdrawnShares: new BigNumber(position.withdrawnShares),
      withdrawnAmount: withdrawnAmount,
      realizedProfit: realizedProfit,
      unrealizedProfit: unrealizedProfit,
      lockedInClaims: lockedEstimateAmount
    };
}
