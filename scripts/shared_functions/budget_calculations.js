/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      budget_calculations.js
Purpose:     Provides shared Budget data, allocation, and tax calculations.
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/
'use strict';
window.BudgetCalculations = (() => {
const getBudgetData = () => window.YB || window.youthBudgetMetadata;
const getFigureData = () => window.PREFU_metadata || {};
const youthBudgetData = getBudgetData();
const dashboardData = window.BUDGET_DATA;
const dashboardReference = window.BUDGET_REF;
const isDashboardPage = Boolean(dashboardData && dashboardReference);
const dashboardUtilities = window.UtilityHelpers || window.UtlityFunctions || {};

//==========================================================================
// Dashboard constants
//==========================================================================
const TOTAL_APPROPRIATIONS_GROUP = 'Total Appropriations';
const TOTAL_REVENUE_GROUP = 'Total Crown Revenue and Capital Receipts';
const SUMMARY_OF_TRENDS_VOTE = 'Summary of Trends';
const BUDGET_AMOUNT_TYPE = 'Total Budget';
const FINAL_BUDGETED_AMOUNT_TYPE = 'Final Budgeted';
const TREND_AMOUNT_TYPE_LABELS = { Actual: 'Actual', 'Final Budgeted': 'Final budgeted', 'Total Budget': 'Budget', Estimated: 'Forecast' };
const APPROPRIATION_TYPE_TERMS = {
  'Output Expenses': 'output',
  'Benefits or Related Expenses': 'benefits',
  'Other Expenses': 'other',
  'Capital Expenditure': 'capital',
  'Borrowing Expenses': 'borrowing',
  'Intelligence and Security Department Expenses and Capital Expenditure': 'intel'
};

// Sums a numeric field across rows, treating missing values as zero.
const sumField = (rows, fieldName) => rows.reduce((runningTotal, row) => runningTotal + (row[fieldName] || 0), 0);

// Sums financial activity rows matching the supplied filters.
function sumFinancialActivity(filters) {
  return dashboardData.sfa
    .filter(record => Object.keys(filters).every(key => filters[key] === undefined || record[key] === filters[key]))
    .reduce((total, record) => total + record.value, 0);
}

// Builds Votes, lookups and trend years from the raw dashboard data.
function buildDashboardModel() {
  const budgetYear = dashboardData.budgetYear;
  const previousYear = dashboardData.previousYear;
  const sectorByName = new Map(dashboardReference.sectors.map(sector => [sector.name, sector]));
  const otherSector = { id: 'other', name: 'Other', colour: '#acacac', votes: [] };
  const findSector = voteName => sectorByName.get(dashboardData.voteSectors[voteName]) || otherSector;

  const appropriations = dashboardData.appropriations;
  const multiYearAppropriations = dashboardData.multiYear;
  appropriations.forEach(appropriation => (appropriation.sector = findSector(appropriation.vote).name));
  multiYearAppropriations.forEach(multiYear => (multiYear.sector = findSector(multiYear.vote).name));
  const topLevelAppropriations = appropriations.filter(appropriation => appropriation.kind !== 'category');
  const transferAppropriations = topLevelAppropriations.filter(appropriation => appropriation.transfer);

  const voteNames = [...new Set(dashboardData.sfa.filter(record => record.vote !== SUMMARY_OF_TRENDS_VOTE).map(record => record.vote))];
  const votes = voteNames.map(voteName => {
    const voteAppropriations = topLevelAppropriations.filter(appropriation => appropriation.vote === voteName);
    const voteMultiYears = multiYearAppropriations.filter(multiYear => multiYear.vote === voteName);
    const voteTransfers = voteAppropriations.filter(appropriation => appropriation.transfer);
    const responsibleRecords = voteAppropriations.concat(voteMultiYears);
    return {
      name: voteName,
      id: dashboardUtilities.slug(voteName),
      sector: findSector(voteName),
      totalAll: sumFinancialActivity({ vote: voteName, group: TOTAL_APPROPRIATIONS_GROUP, amountType: BUDGET_AMOUNT_TYPE, year: budgetYear }),
      prevAll: sumFinancialActivity({ vote: voteName, group: TOTAL_APPROPRIATIONS_GROUP, amountType: FINAL_BUDGETED_AMOUNT_TYPE, year: previousYear }),
      transfers: sumField(voteTransfers, 'budget'),
      transfersPrev: sumField(voteTransfers, 'prevFinal'),
      revenue: sumFinancialActivity({ vote: voteName, group: TOTAL_REVENUE_GROUP, amountType: BUDGET_AMOUNT_TYPE, year: budgetYear }),
      count: voteAppropriations.length + voteMultiYears.filter(multiYear => !multiYear.unsplit).length,
      ministerCodes: [...new Set(responsibleRecords.map(record => record.ministerCode).filter(Boolean))],
      departmentCodes: [...new Set(responsibleRecords.map(record => record.departmentCode).filter(Boolean))],
      check: dashboardData.checks.find(check => check.vote === voteName)
    };
  }).sort((first, second) => second.totalAll - first.totalAll);

  return {
    votes,
    appropriations,
    multiYearAppropriations,
    topLevelAppropriations,
    transferAppropriations,
    financialTrendYears: ['2021/22', '2022/23', '2023/24', '2024/25', previousYear, budgetYear, '2027/28', '2028/29', '2029/30'],
    financialTrendAmountTypes: { '2021/22': 'Actual', '2022/23': 'Actual', '2023/24': 'Actual', '2024/25': 'Actual', [previousYear]: 'Final Budgeted', [budgetYear]: 'Total Budget', '2027/28': 'Estimated', '2028/29': 'Estimated', '2029/30': 'Estimated' },
    voteById: new Map(votes.map(vote => [vote.id, vote])),
    voteByName: new Map(votes.map(vote => [vote.name, vote])),
    appropriationById: new Map(appropriations.map(appropriation => [appropriation.id, appropriation])),
    multiYearAppropriationById: new Map(multiYearAppropriations.map(multiYear => [multiYear.id, multiYear]))
  };
}

// The youth budget pages load this file without BUDGET_DATA, so the model is only built when it exists.
const dashboardModel = isDashboardPage ? buildDashboardModel() : {};
const { votes, appropriations, multiYearAppropriations, topLevelAppropriations, transferAppropriations, financialTrendYears, financialTrendAmountTypes, voteById, voteByName, appropriationById, multiYearAppropriationById } = dashboardModel;
const budgetData = dashboardData;

const initialiseBudgetData = () => {
  if (!youthBudgetData) return;

  const figureData = getFigureData();
  Object.keys(figureData.spendingTotal || {}).forEach(yearKey => {
    if (youthBudgetData.years && youthBudgetData.years[yearKey]) {
      youthBudgetData.years[yearKey].spending = figureData.spendingTotal[yearKey];
      youthBudgetData.years[yearKey].revenue = figureData.revenueTotal[yearKey];
    }
  });
};
initialiseBudgetData();

  //==========================================================================
  // Figure lookup
  //==========================================================================

  // Returns yearly values for a figure key.
  function lookupFigureValue(figureTable, figureKey, missingFigureKeys = []) {
    const budgetData = getBudgetData();
    const yearValues = figureTable[figureKey];

    if (!yearValues) {
      missingFigureKeys.push(figureKey);
      return { [budgetData.currentYear]: 0, [budgetData.previousYear]: 0 };
    }

    return yearValues;
  }

  function getItemYearValue(item, yearKey) {
    const legacyMap = item?.yearValues || {};
    const modernMap = item?.v || {};
    return modernMap[String(yearKey)] ?? modernMap[yearKey] ?? legacyMap[String(yearKey)] ?? legacyMap[yearKey] ?? 0;
  }

  function getItemLabel(item) {
    const budgetData = getBudgetData();
    if (item?.label) return item.label;
    return budgetData.labelStyle === 'plain'
      ? (item?.plain || item?.name || item?.id || '')
      : (item?.name || item?.plain || item?.id || '');
  }

  //==========================================================================
  // Budget data
  //==========================================================================

  // Returns spending items for a selected year.
  function getSpendingItems(year) {
    const budgetData = getBudgetData();
    const spendingGroupOrder = (budgetData.spendGroups || []).map(group => group.id);
    const safeYear = year || budgetData.currentYear;
    const safePreviousYear = budgetData.previousYear || budgetData.currentYear;

    const spendingItems = (budgetData.spending || []).map(spendingItem => {
      const itemYearValues = spendingItem.yearValues || spendingItem.v || {};
      return {
        ...spendingItem,
        label: getItemLabel(spendingItem),
        yearValues: itemYearValues,
        selectedYearValue: getItemYearValue(spendingItem, safeYear),
        previousYearValue: getItemYearValue(spendingItem, safePreviousYear),
        currentYearValue: getItemYearValue(spendingItem, budgetData.currentYear)
      };
    });

    const otherSpendingForYear = selectedYear => {
      const currentYearBudget = budgetData.years?.[selectedYear] || { spending: 0 };
      return currentYearBudget.spending - (budgetData.spending || []).reduce(
        (total, spendingItem) => total + getItemYearValue(spendingItem, selectedYear),
        0
      );
    };

    spendingItems.sort(
      (leftItem, rightItem) =>
        spendingGroupOrder.indexOf(leftItem.group) -
          spendingGroupOrder.indexOf(rightItem.group) ||
        rightItem.currentYearValue - leftItem.currentYearValue
    );

    spendingItems.push({
      ...budgetData.other,
      label: getItemLabel(budgetData.other),
      selectedYearValue: otherSpendingForYear(year),
      previousYearValue: otherSpendingForYear(budgetData.previousYear),
      currentYearValue: otherSpendingForYear(budgetData.currentYear)
    });

    return spendingItems;
  }

  // Returns revenue items for a selected year.
  function getRevenueItems(year) {
    const budgetData = getBudgetData();
    const revenueGroupOrder = (budgetData.revenueGroups || []).map(group => group.id);
    const safeYear = year || budgetData.currentYear;

    return (budgetData.revenue || [])
      .map(revenueItem => {
        const itemYearValues = revenueItem.yearValues || revenueItem.v || {};
        return {
          ...revenueItem,
          label: getItemLabel(revenueItem),
          yearValues: itemYearValues,
          selectedYearValue: getItemYearValue(revenueItem, safeYear),
          previousYearValue: getItemYearValue(revenueItem, budgetData.previousYear),
          currentYearValue: getItemYearValue(revenueItem, budgetData.currentYear)
        };
      })
      .sort(
        (leftItem, rightItem) =>
          revenueGroupOrder.indexOf(leftItem.group) -
            revenueGroupOrder.indexOf(rightItem.group) ||
          rightItem.currentYearValue - leftItem.currentYearValue
      );
  }

  // Returns revenue groups with calculated totals.
  function getRevenueGroups(year) {
    const budgetData = getBudgetData();
    const safeYear = year || budgetData.currentYear;
    return (budgetData.revenueGroups || []).map(revenueGroup => ({
      ...revenueGroup,
      value: (budgetData.revenue || [])
        .filter(revenueItem => revenueItem.group === revenueGroup.id)
        .reduce(
          (total, revenueItem) => total + getItemYearValue(revenueItem, safeYear),
          0
        )
    }));
  }

  //==========================================================================
  // Dashboard calculations
  //==========================================================================

  // Returns whether an appropriation should be included in dashboard totals.
  function isAppropriationIncluded(appropriation) { return !appropriation.transfer || dashboardUtilities.dashboardDisplayOptions?.includeTransfers; }

  // Calculates a Vote total using the current transfer display setting.
  function calculateVoteTotal(vote) { return dashboardUtilities.dashboardDisplayOptions?.includeTransfers ? vote.totalAll : vote.totalAll - vote.transfers; }

  // Calculates the previous Vote total using the current transfer display setting.
  function calculateVotePreviousTotal(vote) { return dashboardUtilities.dashboardDisplayOptions?.includeTransfers ? vote.prevAll : vote.prevAll - vote.transfersPrev; }

  // Summarises dashboard totals when dashboard data is loaded.
  const totalAmounts = isDashboardPage ? {
    all: sumFinancialActivity({ vote: SUMMARY_OF_TRENDS_VOTE, group: TOTAL_APPROPRIATIONS_GROUP, amountType: BUDGET_AMOUNT_TYPE, year: dashboardData.budgetYear }),
    transfers: sumField(transferAppropriations, 'budget'),
    transfersPrev: sumField(transferAppropriations, 'prevFinal'),
    largestTransfer: Math.max(0, ...transferAppropriations.map(appropriation => appropriation.budget || 0)),
    revenue: sumFinancialActivity({ vote: SUMMARY_OF_TRENDS_VOTE, group: TOTAL_REVENUE_GROUP, amountType: BUDGET_AMOUNT_TYPE, year: dashboardData.budgetYear }),
    tax: sumFinancialActivity({ vote: SUMMARY_OF_TRENDS_VOTE, category: 'Tax Revenue', amountType: BUDGET_AMOUNT_TYPE, year: dashboardData.budgetYear }),
    // Recalculated on every read so it follows the transfers setting.
    get spending() { return dashboardUtilities.dashboardDisplayOptions?.includeTransfers ? this.all : this.all - this.transfers; }
  } : {};

  // Finds the sector for a Vote name.
  function sectorForVote(voteName) { return voteByName.get(voteName)?.sector || {}; }

  // Groups appropriations by type for the whole Budget or one Vote.
function getAppropriationsByType(requestedVoteName) {
    const voteName = requestedVoteName || SUMMARY_OF_TRENDS_VOTE;
    const valueByCategory = {};
    dashboardData.sfa.forEach(record => {
      if (record.vote !== voteName || record.side !== 'Appropriations' || record.year !== dashboardData.budgetYear || record.amountType !== BUDGET_AMOUNT_TYPE) return;
      if (record.group !== 'Single' && record.group !== 'MCA') return;
      valueByCategory[record.category] = (valueByCategory[record.category] || 0) + record.value;
    });
    if (!dashboardUtilities.dashboardDisplayOptions?.includeTransfers) {
      transferAppropriations
        .filter(appropriation => voteName === SUMMARY_OF_TRENDS_VOTE || appropriation.vote === voteName)
        .forEach(appropriation => {
          const category = Object.keys(APPROPRIATION_TYPE_TERMS).find(categoryName => appropriation.type.includes(categoryName.replace(' or Related', '')));
          if (category && valueByCategory[category] != null) valueByCategory[category] -= appropriation.budget || 0;
        });
    }
    return Object.entries(valueByCategory)
      .map(([category, value]) => ({ category, value, term: APPROPRIATION_TYPE_TERMS[category] }))
      .filter(row => row.value > 0)
      .sort((first, second) => second.value - first.value);
  }

  // Groups appropriation responsibility totals by minister or department code.
  function getResponsibilitiesByCode(codeField) {
    const rowsByCode = {};
    topLevelAppropriations.concat(multiYearAppropriations).forEach(record => {
      const code = record[codeField];
      if (!code) return;
      if (!rowsByCode[code]) rowsByCode[code] = { code, count: 0, total: 0, votes: new Set(), portfolios: new Set() };
      rowsByCode[code].count++;
      if (isAppropriationIncluded(record)) rowsByCode[code].total += (record.budget != null ? record.budget : record.budgetYear) || 0;
      rowsByCode[code].votes.add(record.vote);
      if (record.portfolio) rowsByCode[code].portfolios.add(record.portfolio);
    });
    return rowsByCode;
  }

  // Returns trend rows for the dashboard overview or a selected Vote.
  function getFinancialTrendRows(requestedVoteName) {
    const voteName = requestedVoteName || SUMMARY_OF_TRENDS_VOTE;
    return financialTrendYears.map(year => {
      const amountType = financialTrendAmountTypes[year];
      return {
        year,
        amountType,
        label: TREND_AMOUNT_TYPE_LABELS[amountType],
        spending: sumFinancialActivity({ vote: voteName, group: TOTAL_APPROPRIATIONS_GROUP, amountType, year }),
        revenue: sumFinancialActivity({ vote: voteName, group: TOTAL_REVENUE_GROUP, amountType, year })
      };
    });
  }

  //==========================================================================
  // Budget calculations
  //==========================================================================

  // Converts a Budget amount into a per-person amount.
  function calculatePerPersonAmount(amount, population = getBudgetData().population) {
    return population > 0 ? (amount * 1e6) / population : 0;
  }

  // Allocates whole-number shares that sum to the requested total.
  function sharePercentages(values, total = 100) {
    const valueTotal = values.reduce((sum, value) => sum + value, 0) || 1;
    const rawShares = values.map(value => (value / valueTotal) * total);
    const allocatedShares = rawShares.map(Math.floor);

    let remainingUnits = total - allocatedShares.reduce((sum, value) => sum + value, 0);

    rawShares
      .map((share, index) => [share - Math.floor(share), index])
      .sort((leftShare, rightShare) => rightShare[0] - leftShare[0])
      .forEach(([, index]) => {
        if (remainingUnits > 0) {
          allocatedShares[index]++;
          remainingUnits--;
        }
      });

    return allocatedShares;
  }

  //==========================================================================
  // Tax calculations
  //==========================================================================
  // Returns a tax breakdown by bracket.
  function getTaxBracketBreakdown(taxableIncome) {
    const budgetData = getBudgetData();
    return budgetData.brackets.map(([lowerLimit, upperLimit, taxRate]) => {
      const incomeInBracket = Math.max(0, Math.min(taxableIncome, upperLimit) - lowerLimit);

      return {
        lowerLimit,
        upperLimit,
        taxRate,
        incomeInBracket,
        taxAmount: incomeInBracket * taxRate
      };
    });
  }

  // Calculates annual income tax.
  function calculateIncomeTax(taxableIncome) {
    return getTaxBracketBreakdown(taxableIncome)
      .reduce((totalTax, taxBracket) => totalTax + taxBracket.taxAmount, 0);
  }

  // Calculates GST contained within a GST-inclusive amount.
  function calculateGstPaid(spendingAmount, gstRate = getBudgetData().gstRate) {
    return (spendingAmount * gstRate) / (1 + gstRate);
  }

  // Calculates the share of tax attributed to a spending area.
  function calculateTaxShare(totalTaxPaid, spendingAreaAmount, totalSpending, periodDivisor = 1) {
    return (totalTaxPaid * spendingAreaAmount) / totalSpending / periodDivisor;
  }

  // Returns the highest tax rate applying to an income.
  function getTopTaxRate(taxableIncome) {
    const budgetData = getBudgetData();
    return (
      budgetData.brackets.find(
        ([lowerLimit, upperLimit]) =>
          taxableIncome > lowerLimit && taxableIncome <= upperLimit
      ) || budgetData.brackets[0]
    )[2];
  }

  return {
    lookupFigureValue,
    getSpendingItems,
    getRevenueItems,
    getRevenueGroups,
    calculatePerPersonAmount,
    sharePercentages,
    calculateIncomeTax,
    calculateGstPaid,
    calculateTaxShare,
    getTopTaxRate,
    getTaxBracketBreakdown,
    totalAmounts,
    calculateVoteTotal,
    calculateVotePreviousTotal,
    isAppropriationIncluded,
    getFinancialTrendRows,
    getAppropriationsByType,
    getResponsibilitiesByCode,
    sumFinancialActivity,
    sectorForVote,
    budgetData,
    votes,
    appropriations,
    topLevelAppropriations,
    multiYearAppropriations,
    voteById,
    voteByName,
    appropriationById,
    multiYearAppropriationById,
    financialTrendYears
  };
})();