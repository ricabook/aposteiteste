/**
 * Utility function to calculate potential return for betting
 * Based on the correct logic: losing bets pool divided by winning bettors count
 */

export interface BetData {
  option_chosen: string;
  amount: number;
}

export interface PotentialReturnInput {
  userBetAmount: number;
  userSelectedOption: string;
  allBets: BetData[];
}

/**
 * Calculates the potential return for a user's bet
 * Formula: Initial bet + (Total losing bets / Number of winning bettors)
 * 
 * @param input - Object containing user bet amount, selected option, and all bets data
 * @returns The total potential return (including initial bet amount)
 */
export function calculatePotentialReturn(input: PotentialReturnInput): number {
  const { userBetAmount, userSelectedOption, allBets } = input;
  
  // If user bet amount is invalid, return 0
  if (userBetAmount <= 0) return 0;
  
  // Separate winning and losing bets (including user's projected bet)
  const winningBets = allBets.filter(bet => bet.option_chosen === userSelectedOption);
  const losingBets = allBets.filter(bet => bet.option_chosen !== userSelectedOption);
  
  // Calculate total amounts
  const totalWinningAmount = winningBets.reduce((sum, bet) => sum + bet.amount, 0) + userBetAmount;
  const totalLosingAmount = losingBets.reduce((sum, bet) => sum + bet.amount, 0);
  
  // Count unique winning bettors (existing + user if not already betting on this option)
  const existingWinningBettors = new Set(winningBets.map((_, index) => index)).size;
  const totalWinningBettors = existingWinningBettors + 1; // +1 for the user
  
  // If there are no losing bets, user only gets back what they bet
  if (totalLosingAmount === 0) {
    return userBetAmount;
  }
  
  // If user is the only winner, they get their bet + all losing bets
  if (totalWinningBettors === 1) {
    return userBetAmount + totalLosingAmount;
  }
  
  // Normal case: user gets their bet + proportional share of losing pool
  // The proportion is based on bet amount vs total winning amount
  const userProportion = userBetAmount / totalWinningAmount;
  const extraReturn = totalLosingAmount * userProportion;
  
  return userBetAmount + extraReturn;
}

/**
 * Calculates potential return for existing position (without adding new bet)
 * Used in Portfolio page to show current potential returns
 */
export function calculateExistingPositionReturn(
  userBetAmount: number,
  userSelectedOption: string,
  allBets: BetData[]
): number {
  if (userBetAmount <= 0) return 0;
  
  // For existing positions, don't add user bet again - it's already in allBets
  const winningBets = allBets.filter(bet => bet.option_chosen === userSelectedOption);
  const losingBets = allBets.filter(bet => bet.option_chosen !== userSelectedOption);
  
  const totalWinningAmount = winningBets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalLosingAmount = losingBets.reduce((sum, bet) => sum + bet.amount, 0);
  
  // Count unique winning bettors
  const totalWinningBettors = winningBets.length;
  
  // If no losing bets or only one winner, return just the bet amount
  if (totalLosingAmount === 0 || totalWinningBettors === 0) {
    return userBetAmount;
  }
  
  // Calculate user's proportion of winning pool
  const userProportion = userBetAmount / totalWinningAmount;
  const extraReturn = totalLosingAmount * userProportion;
  
  return userBetAmount + extraReturn;
}