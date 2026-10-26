const config = require('../config/config');

/**
 * Calculate fine details for a loan
 * @param {Date} dueDate 
 * @param {Date} [actualReturnDate=new Date()]
 * @param {Object} [customPolicy]
 * @returns {{ overdueDays: number, fineAmount: number, isOverdue: boolean }}
 */
const calculateLoanFine = (dueDate, actualReturnDate = new Date(), customPolicy = {}) => {
  const rate = customPolicy.rate !== undefined ? customPolicy.rate : config.fineRatePerDay;
  const maxFine = customPolicy.maxFine !== undefined ? customPolicy.maxFine : config.maxFineAmount;

  const due = new Date(dueDate);
  const returned = new Date(actualReturnDate);

  // Normalize both dates to UTC midnight for precise calendar day calculation
  const utcDue = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const utcReturned = Date.UTC(returned.getUTCFullYear(), returned.getUTCMonth(), returned.getUTCDate());
  const msInDay = 1000 * 60 * 60 * 24;
  const overdueDays = Math.max(0, Math.floor((utcReturned - utcDue) / msInDay));

  if (overdueDays <= 0) {
    return {
      overdueDays: 0,
      fineAmount: 0.0,
      isOverdue: false
    };
  }

  let fineAmount = overdueDays * rate;
  if (fineAmount > maxFine) {
    fineAmount = maxFine;
  }

  // Round to 2 decimal places
  fineAmount = Math.round(fineAmount * 100) / 100;

  return {
    overdueDays,
    fineAmount,
    isOverdue: true
  };
};

module.exports = {
  calculateLoanFine
};
