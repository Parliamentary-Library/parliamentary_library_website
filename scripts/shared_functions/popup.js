/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      popup.js
Purpose:     Reusable functions for the creation of custom popups within the code.
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/
'use strict';
window.PopupText = (() => {
  const budgetData = window.youthBudgetMetadata || {};
  const currentYear = budgetData.currentYear;
  // Gets the budget calculations module, and errors if it has not been loaded yet
  const getBudgetCalculations = () => {
    const budgetCalculations = window.BudgetCalculations;
    if (!budgetCalculations) {
      throw new Error('BudgetCalculations must be loaded before PopupText is used.');
    }
    return budgetCalculations;
  };
  const { selectOne, createElement, formatBillions, formatBillionsChange, formatDollars, formatPercentChange, roundToStep, getSpendingGroupColour } = window.UtilityHelpers;
  const popupDialog = selectOne('#pop');
 
  // Closes the popup if it is open
  const closePopup = () => popupDialog.open && popupDialog.close();
  
  // Creates a paragraph with optional class
  const createParagraph = (text, className = null) => createElement('p', { class: className, text });
 
  // Creates a bullet list from an array of text items
  const createBulletList = textItems => createElement('ul', {}, textItems.map(text => createElement('li', { text })));
 
  // Creates a link styled as a popup button (closes the popup when clicked)
  const createPopupLink = (href, text, isPrimary = false) => createElement('a', { class: 'btn' + (isPrimary ? ' btn-primary' : ''), href, onclick: closePopup }, text);
  
  // Creates a popup button that runs the given click function
  const createPopupButton = (text, onClick, isPrimary = false) => createElement('button', { type: 'button', class: 'btn' + (isPrimary ? ' btn-primary' : ''), onclick: onClick }, text);
 
  // Creates a plain label/value fact list from [label, value] rows
  const createFactList = factRows => createElement('div', { class: 'pop-facts' }, factRows.map(([label, value]) => createElement('div', {}, createElement('span', { text: label }), createElement('b', { text: value }))));
  
  // Creates one stat card with a title, year, value and unit
  // Creates one stat card; title/year/unit are skipped when empty, and valueNote shows as grey text after the value
  const createStatCard = (titleText, yearText, valueText, unitText, valueNote = '') => createElement('article', { class: 'stat-card' },
    ...(titleText ? [createElement('h3', { class: 'stat-title', text: titleText })] : []),
    ...(yearText ? [createElement('p', { class: 'stat-year', text: yearText })] : []),
    createElement('p', { class: 'stat-value' }, valueText, ...(valueNote ? [createElement('span', { class: 'stat-value-note', text: ' ' + valueNote })] : [])),
    ...(unitText ? [createElement('p', { class: 'stat-unit', text: unitText })] : []));


  // Wraps any number of stat cards in the stat cards container
  const createStatCards = (...statCards) => createElement('div', { class: 'stat-cards' }, statCards);

    // Works out the change since last year in amount and percent for a spending item
  const getYearChange = item => {
    const amountChange = item.currentYearValue - item.previousYearValue;
    return { amountChange, percentChange: item.previousYearValue ? (amountChange / item.previousYearValue) * 100 : 0 };
  };

  // Creates stat cards for the amount, share of $100 and per-person figures, plus since last year when an item is passed in
  // Creates stat cards (value with label underneath), plus since last year (percent in grey) when an item is passed in
  const createAmountFacts = (amount, shareOfHundred, sinceLastYearItem = null) => {
    const { calculatePerPersonAmount } = getBudgetCalculations();
    const { amountChange, percentChange } = sinceLastYearItem ? getYearChange(sinceLastYearItem) : {};
    return createStatCards(...[
      createStatCard('', '', formatBillions(amount), 'Amount'),
      createStatCard('', '', '$' + shareOfHundred, 'Out of $100'),
      createStatCard('', '', formatDollars(roundToStep(calculatePerPersonAmount(amount), 10)), 'Per person'),
      sinceLastYearItem && createStatCard('', '', formatBillionsChange(amountChange), 'Since last year', formatPercentChange(percentChange))
    ].filter(Boolean));
  };

  // Fills in and opens the popup dialog with the given kicker, title, colour, body and action buttons
  function openPopup({ kicker = '', title, colour = 'var(--ink)', body = [], actions = [] }) {
    selectOne('#pop-kicker').textContent = kicker;
    selectOne('#pop-title').textContent = title;
    popupDialog.style.setProperty('--c', colour);
    selectOne('#pop-body').replaceChildren(...[body].flat(Infinity).filter(Boolean).map(item => (typeof item === 'string' ? createParagraph(item) : item)));
    selectOne('#pop-actions').replaceChildren(...actions.filter(Boolean));
    if (popupDialog.open) popupDialog.close();
    popupDialog.showModal();
    selectOne('#pop-close').focus();
  }

  // Creates the "Since last year" paragraph showing the change in amount and percent
  
  function createSinceLastYearParagraph(item) {
    const { amountChange, percentChange } = getYearChange(item);
    return createElement('p', {}, 'Since last year: ', createElement('b', { text: formatBillionsChange(amountChange) + ' (' + formatPercentChange(percentChange) + ')' }));
  }

  // function createSinceLastYearParagraph(item) {
  //   const amountChange = item.currentYearValue - item.previousYearValue;
  //   const percentChange = item.previousYearValue ? (amountChange / item.previousYearValue) * 100 : 0;
  //   return createElement('p', {}, 'Since last year: ', createElement('b', { text: formatBillionsChange(amountChange) + ' (' + formatPercentChange(percentChange) + ')' }));
  // }

  // Opens the popup for a spending area, with its description, stat cards and a link to change it in the user's Budget
  function openSpendingAreaPopup(areaId, year = currentYear) {
    const { getSpendingItems, sharePercentages } = getBudgetCalculations();
    const spendingItems = getSpendingItems(year);
    const itemIndex = spendingItems.findIndex(item => item.id === areaId);
    if (itemIndex < 0) return;
    const item = spendingItems[itemIndex];
    const shares = sharePercentages(spendingItems.map(spendingItem => spendingItem.selectedYearValue));
    openPopup({
      kicker: 'Where it goes · ' + budgetData.years[year].label,
      title: item.label,
      colour: getSpendingGroupColour(item.group),
      body: [item.desc, createAmountFacts(item.selectedYearValue, shares[itemIndex], year === currentYear ? item : null), budgetData.labelStyle === 'plain' && createParagraph('Official name: ' + item.official, 'small')],
      actions: [createPopupLink('#/build?focus=' + item.id, 'Change it in your Budget', true)]
    });
  }
  selectOne('#pop-close').addEventListener('click', closePopup);
  popupDialog.addEventListener('click', event => event.target === popupDialog && closePopup());
  return { closePopup, createParagraph, createBulletList, createPopupLink, createPopupButton, createFactList, createStatCard, createStatCards, createAmountFacts, openPopup, createSinceLastYearParagraph, openSpendingAreaPopup };
})();