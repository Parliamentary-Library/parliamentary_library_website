/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      youth_budget.js
Purpose:     Delegates the youth_budget page functionality.
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/

'use strict';
(() => {
  const budgetData = window.youthBudgetMetadata;
  const figureData = window.PREFU_metadata;
  const { lookupFigureValue, getSpendingItems, getRevenueItems, getRevenueGroups, calculatePerPersonAmount, sharePercentages } = window.BudgetCalculations;
  const { selectOne, selectAll, createElement } = window.UtilityHelpers;
  const { renderTreemap } = window.TreeMapCreator;
  const { createColourKey } = window.ChartTools;
  const { formatBillions, formatBillionsLong, formatDollars, formatBillionsChange, formatPercentChange, roundToStep, formatApproximateDollars, formatApproximateDollarPhrase, parseNumberInput, formatUnitText, getSpendingGroupColour, getRevenueGroupColour, getRevenueItemColour, isHatchedGroup, isMotionAllowed, getSelectedRadioValue, addListeners, sumValues, createTreemapItem } = window.YouthFormat;
  const { openPopup, closePopup, createParagraph, createBulletList, createPopupLink, createPopupButton, createFactList, createAmountFacts, createSinceLastYearParagraph, openSpendingAreaPopup } = window.PopupText;
  const missingFigureKeys = [];
  ['2627', '2526'].forEach(yearKey => {
    budgetData.years[yearKey].spending = figureData.spendingTotal[yearKey];
    budgetData.years[yearKey].revenue = figureData.revenueTotal[yearKey];
  });
  budgetData.spending.forEach(spendingItem => {
    const yearValues = spendingItem.v && Object.keys(spendingItem.v).length ? { ...spendingItem.v } : lookupFigureValue(figureData.spending, spendingItem.vote, missingFigureKeys);
    if (!spendingItem.yearValues || !Object.keys(spendingItem.yearValues).length || (spendingItem.v && Object.keys(spendingItem.v).length)) {
      spendingItem.yearValues = yearValues;
    }
  });
  budgetData.revenue.forEach(revenueItem => {
    const yearValues = revenueItem.v && Object.keys(revenueItem.v).length ? { ...revenueItem.v } : lookupFigureValue(figureData.revenue, revenueItem.line, missingFigureKeys);
    if (!revenueItem.yearValues || !Object.keys(revenueItem.yearValues).length || (revenueItem.v && Object.keys(revenueItem.v).length)) {
      revenueItem.yearValues = yearValues;
    }
  });
  budgetData.taxpayers = figureData.taxpayers;
  if (missingFigureKeys.length) console.error('Not found in data/figures.js (check the names in js/data.js and the spreadsheet): ' + missingFigureKeys.join(', '));
  budgetData.spending.concat([budgetData.other], budgetData.revenue).forEach(budgetItem => {
    budgetItem.label = budgetItem.label || (budgetData.labelStyle === 'plain' ? (budgetItem.plain || budgetItem.name) : (budgetItem.name || budgetItem.plain));
  });

  const currentYear = budgetData.currentYear;
  const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

  const buildAmountRows = (items, getColour, getAmountText) => items.map((item, index) => ({ item, colour: getColour(item), amountText: getAmountText(item, index) }));
  const createSourceNodes = sourceList => sourceList.map((source, index) => [index ? '; ' : '', source.url ? createElement('a', { href: source.url, target: '_blank', rel: 'noopener', text: source.text }) : source.text]);

  function setTotalRow(table, label, valueText) {
    const footer = table.querySelector('tfoot') || table.appendChild(createElement('tfoot'));
    footer.replaceChildren(createElement('tr', {}, createElement('th', { scope: 'row', text: label }), createElement('td', { class: 'num', text: valueText })));
  }

  function renderAmountRows(tableBody, rows, { selectedId, onSelect, totalLabel, totalText }) {
    setTotalRow(tableBody.parentElement, totalLabel, totalText);
    tableBody.replaceChildren(...rows.map(({ item, colour, amountText }) => createElement('tr', { class: selectedId === item.id ? 'is-selected' : null },
      createElement('th', { scope: 'row' }, createElement('span', { class: 'cell-flex' }, createColourKey(colour, isHatchedGroup(item.group)),
        createElement('button', { type: 'button', class: 'link-btn', 'aria-pressed': selectedId === undefined ? null : String(selectedId === item.id), onclick: () => onSelect(item.id) }, item.label))),
      createElement('td', { class: 'num', text: amountText }))));
  }

  const OVERVIEW_POPUP = {
  title: 'Nau mai, welcome to Budget Buddy!',
  body: ['Have a browse to find out more about where the Government money comes from, where it goes, and play with the numbers to imagine how you would do it.'],
  actions: [createPopupButton('Start', closePopup, true)]
  };
  let hasSeenOverviewWelcome = false;


  const STATIC_POPUPS = {
    'why-gap': {
      kicker: 'The gap',
      title: 'Why spend more than comes in?',
      body: [
        createBulletList(['To keep services running when less tax comes in, for example in a recession.', 
          'To invest in big projects that last for many years like hospitals and public transport.', 
          'To adapt to climate change, prepare for the future and respond to emergencies, like earthquakes and floods.']),
          'Borrowing costs money. The interest the Government pays on its debt is one of the areas of spending.'
      ],
      actions: [createPopupLink('#/build', 'Have a play, what would you do?', true)]
    },
    'why-change': {
      kicker: 'What changed',
      title: 'Why do amounts change?',
      body: [createBulletList(['The Government may decide to start something new, grow it, or stop it.', 'Costs rise over time, as wages and prices go up.', 'More people may need a service, such as more students, patients or people over 65.', 'Money is sometimes moved from one area to another, without any real change to services.'])]
    },
    'why-pot': {
      kicker: 'Your tax',
      title: 'Does my tax pay for something specific?',
      body: ['No. Income tax, GST, company tax and other income all go into one pot. Parliament approves how the pot is spent.', 'So this shows what your tax would look like if it were split the same way as the whole Budget.']
    },
    'tax-leaves-out': {
      kicker: 'Your tax',
      title: 'What this leaves out',
      body: [
        createBulletList(['It leaves out ACC levies, KiwiSaver and student loan repayments, because they are not income tax.', 'It leaves out tax credits, such as the independent earner tax credit.', 'It leaves out secondary tax on a second job. Any extra taken is usually refunded.', 'It only counts wages, not other income like interest.']),
        'For your real tax, check your payslip or myIR.'
      ]
    }
  };

  function openGlossaryTermPopup(termId) {
    const glossaryTerm = budgetData.glossary.find(term => term.id === termId);
    if (glossaryTerm) openPopup({ kicker: 'What does this mean?', title: glossaryTerm.term, body: [glossaryTerm.def], actions: [createPopupLink('#/help', 'All words')] });
  }

  function openGapPopup() {
  const yearBudget = budgetData.years[currentYear];
  const gapAmount = Math.abs(yearBudget.spending - yearBudget.revenue);

  openPopup({
    kicker: 'The gap',
    title: 'How “the gap” works',
    body: [
      'This figure is the difference between all the money the Government receives and spends over the year.',
      'It differs from the revenue and spending figures above because those include items recorded at different times, and spending on long-term investments is treated differently.',
      createElement('p', { class: 'source' }, 'Source: ', createSourceNodes(budgetData.sources.gap || []).flat())
    ]
  });
}

  function openPerPersonPopup() {
    openPopup({
      kicker: 'Per person',
      title: 'How "per person" works',
      body: [
        'We divide the amount by the number of people in New Zealand: ' + budgetData.population.toLocaleString('en-NZ') + ' at ' + budgetData.populationDate + '.',
        createParagraph('It is a way to picture the size. Nobody actually gets or pays exactly this amount.', 'small'),
        createElement('p', { class: 'source' }, 'Source: ', createSourceNodes(budgetData.sources.population || []).flat())
      ]
    });
  }


  // Opens the popup for a revenue item, with its description, stat cards (including since last year) and tax note
  function openRevenueItemPopup(revenueItemId, year = currentYear) {
    const revenueItems = getRevenueItems(year);
    const itemIndex = revenueItems.findIndex(item => item.id === revenueItemId);
    if (itemIndex < 0) return;
    const item = revenueItems[itemIndex];
    const shares = sharePercentages(revenueItems.map(revenueItem => revenueItem.selectedYearValue));
    const revenueGroup = budgetData.revenueGroups.find(group => group.id === item.group);
    const incomeTaxPerTaxpayer = formatDollars(roundToStep((item.selectedYearValue * 1e6) / budgetData.taxpayers, 100));
    openPopup({
      kicker: revenueGroup.label + ' · ' + budgetData.years[year].label,
      title: item.label,
      colour: getRevenueItemColour(item),
      body: [
        item.desc,
        createAmountFacts(item.selectedYearValue, shares[itemIndex], year === currentYear ? item : null),
        item.id === 'income' && 'Shared across the ' + (budgetData.taxpayers / 1e6).toFixed(1) + ' million people who pay income tax, that is about ' + incomeTaxPerTaxpayer + ' each.',
        budgetData.labelStyle === 'plain' && item.official && createParagraph('Official name: ' + item.official, 'small')
      ]
    });
  }

  function openRevenueGroupPopup(groupId) {
    const revenueGroups = getRevenueGroups(currentYear);
    const groupIndex = revenueGroups.findIndex(group => group.id === groupId);
    const group = revenueGroups[groupIndex];
    const shares = sharePercentages(revenueGroups.map(revenueGroup => revenueGroup.value));
    const groupItems = getRevenueItems(currentYear).filter(revenueItem => revenueItem.group === groupId);
    openPopup({
      kicker: 'Coming in · ' + budgetData.years[currentYear].label,
      title: group.label,
      colour: getRevenueGroupColour(groupId),
      body: [
        group.desc,
        createAmountFacts(group.value, shares[groupIndex]),
        createElement('ul', { class: 'pop-change-list' }, groupItems.map(groupItem => createElement('li', {}, createElement('span', {}, createColourKey(getRevenueItemColour(groupItem)), groupItem.label), createElement('span', { text: formatBillions(groupItem.selectedYearValue) }))))
      ],
      actions: [createPopupLink('#/explore/revenue', 'See where it comes from', true)]
    });
  }

  function renderLegends() {
    const renderLegend = (listElement, groups, getColour) => listElement.replaceChildren(...groups.map(group => createElement('li', {}, createColourKey(getColour(group.id), isHatchedGroup(group.id)), group.label)));
    selectAll('[data-legend=spend]').forEach(listElement => renderLegend(listElement, budgetData.spendGroups, getSpendingGroupColour));
    selectAll('[data-legend=rev]').forEach(listElement => renderLegend(listElement, budgetData.revenueGroups, getRevenueGroupColour));
  }

  function fillStaticValues() {
    const yearBudget = budgetData.years[currentYear];
    const taxRevenue = sumValues(getRevenueGroups(currentYear).filter(group => group.id !== 'nontax').map(group => group.value));
    const taxShareOfTen = Math.round((taxRevenue / yearBudget.revenue) * 10); // no longer used, keeping incase of later use
    const taxShareOfHundred = Math.round((taxRevenue / yearBudget.revenue) * 100);
    const fillValues = {
      'spend-total': formatBillionsLong(yearBudget.spending),
      'spend-person': formatDollars(roundToStep(calculatePerPersonAmount(yearBudget.spending), 100)),
      'rev-total': formatBillionsLong(yearBudget.revenue),
      'rev-tax-share': taxShareOfHundred + 'c',
      'rev-other-share': (100 - taxShareOfHundred) + 'c',
      gap: formatBillionsLong(Math.abs(figureData.gapTotal['2526']))
    };
    selectAll('[data-fill]').forEach(fillTarget => {
      if (fillValues[fillTarget.dataset.fill]) fillTarget.textContent = fillValues[fillTarget.dataset.fill];
    });
  }

  function scaleNumberText(text, scaleFactor) {
    return text.replace(/[\d,]+(\.\d+)?/, matchedNumber => {
      const decimalPlaces = (matchedNumber.split('.')[1] || '').length;
      return (Number(matchedNumber.replace(/,/g, '')) * scaleFactor).toLocaleString('en-NZ', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces });
    });
  }

  function countUp(counterElement, durationMilliseconds = 900) {
    if (!isMotionAllowed() || counterElement.dataset.counted) return;
    counterElement.dataset.counted = '1';
    const finalText = counterElement.textContent;
    const startTime = performance.now();
    const animateFrame = currentTime => {
      const progress = Math.min(1, (currentTime - startTime) / durationMilliseconds);
      counterElement.textContent = progress < 1 ? scaleNumberText(finalText, 1 - Math.pow(1 - progress, 3)) : finalText;
      if (progress < 1) requestAnimationFrame(animateFrame);
    };
    requestAnimationFrame(animateFrame);
  }

  function playTreemapEntrance(treemapHost) {
    if (!isMotionAllowed() || treemapHost.dataset.played) return;
    treemapHost.dataset.played = '1';
    treemapHost.classList.add('tm-enter');
    setTimeout(() => treemapHost.classList.remove('tm-enter'), 1400);
  }

  function playEntrance(blockElement) {
    selectAll('[data-count]', blockElement).forEach(counterElement => countUp(counterElement));
    selectAll('.treemap', blockElement).forEach(playTreemapEntrance);
    if (blockElement.classList.contains('ticker')) startTicker();
    if (selectOne('#ov-tree', blockElement)) setTimeout(showStoryCallout, 900);
  }

  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        revealObserver.unobserve(entry.target);
        entry.target.classList.add('is-in');
        playEntrance(entry.target);
      }), { rootMargin: '0px 0px -8% 0px' })
    : null;

  function setupReveal(pageElement) {
    const blocks = selectAll('.panel, .ticker, .toolbar', pageElement).filter(block => !block.closest('[hidden]') && !block.classList.contains('is-in') && !block.classList.contains('reveal'));
    blocks.forEach(block => {
      if (!isMotionAllowed() || !revealObserver) return playEntrance(block);
      if (block.getBoundingClientRect().top > window.innerHeight * 0.92) {
        block.classList.add('reveal');
        revealObserver.observe(block);
      } else {
        block.classList.add('is-in');
        playEntrance(block);
      }
    });
  }

  let isStoryShown = false;
  function showStoryCallout() {
    const treemapHost = selectOne('#ov-tree');
    if (isStoryShown || !treemapHost || treemapHost.closest('[hidden]')) return;
    isStoryShown = true;
    const spendingItems = getSpendingItems(currentYear);
    const shares = sharePercentages(spendingItems.map(item => item.selectedYearValue));
    const largestIndex = spendingItems.reduce((bestIndex, item, index) => (item.selectedYearValue > spendingItems[bestIndex].selectedYearValue ? index : bestIndex), 0);
    const largestBox = treemapHost.querySelector('.tm-box[data-id="' + spendingItems[largestIndex].id + '"]');
    if (!largestBox) return;
    const callout = createElement('div', { class: 'tm-callout', role: 'status' }, createElement('b', { text: 'Biggest: ' + spendingItems[largestIndex].label }), ' $' + shares[largestIndex] + ' of every $100. Tap any box to learn more.');
    callout.style.left = 'calc(' + largestBox.style.left + ' + 12px)';
    callout.style.top = 'calc(' + largestBox.style.top + ' + 56px)';
    treemapHost.append(callout);
    const dismissCallout = () => {
      callout.classList.add('out');
      setTimeout(() => callout.remove(), 300);
      treemapHost.removeEventListener('click', dismissCallout);
    };
    treemapHost.addEventListener('click', dismissCallout);
    setTimeout(dismissCallout, 7000);
  }

  function renderOverview() {
    const unit = getSelectedRadioValue('ov-unit');
    const spendingItems = getSpendingItems(currentYear);
    const spendingShares = sharePercentages(spendingItems.map(item => item.selectedYearValue));
    const treemapItems = spendingItems.map((item, index) => createTreemapItem(item, item.selectedYearValue, formatUnitText(unit, item.selectedYearValue, spendingShares[index]), getSpendingGroupColour(item.group)));
    renderTreemap(selectOne('#ov-tree'), treemapItems, { onSelect: openSpendingAreaPopup });

    const revenueGroups = getRevenueGroups(currentYear);
    const revenueShares = sharePercentages(revenueGroups.map(group => group.value));
    selectOne('#ov-rev-strip').replaceChildren(...revenueGroups.map((group, index) => {
      const labelText = group.label + ': ' + formatUnitText(unit, group.value, revenueShares[index]);
      return createElement('button', {
        type: 'button',
        class: 'strip-seg' + (isHatchedGroup(group.id) ? ' is-hatched' : ''),
        title: labelText,
        'aria-label': labelText,
        style: { '--c': getRevenueGroupColour(group.id), 'flex-grow': String(revenueShares[index]) },
        onclick: () => openRevenueGroupPopup(group.id)
      });
    }));
    selectAll('#ov-rev-legend li').forEach((legendItem, index) => legendItem.style.setProperty('flex-grow', String(revenueShares[index])));
  }

  let tickerIntervalId = null;

  function getSpentSoFar() {
    const yearMilliseconds = SECONDS_PER_YEAR * 1000;
    const elapsedMilliseconds = Math.max(0, Math.min(yearMilliseconds, Date.now() - new Date(budgetData.yearStart).getTime()));
    return (budgetData.years[currentYear].spending * 1e6 * elapsedMilliseconds) / yearMilliseconds;
  }

  function getTickerText() {
    const spentSoFar = getSpentSoFar();
    if (getSelectedRadioValue('tick') !== 'person') return formatDollars(spentSoFar);
    return '$' + (spentSoFar / budgetData.population).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function renderTicker(shouldAnnounce) {
    const tickerText = getTickerText();
    const spendingPerSecond = (budgetData.years[currentYear].spending * 1e6) / SECONDS_PER_YEAR;
    const rateText = getSelectedRadioValue('tick') === 'person' ? formatDollars((spendingPerSecond * 86400) / budgetData.population) + ' a day for each person' : formatDollars(spendingPerSecond) + ' every second';
    selectOne('#tick-value').textContent = tickerText;
    selectOne('#tick-note').textContent = 'These numbers are big, which is why choices about how much to spend and where it goes matter.';
    selectOne('#tick-italics').textContent = 'This estimate assumes spending is spread evenly across the year.';
    if (shouldAnnounce) selectOne('#tick-sr').textContent = 'About ' + tickerText + ' so far.';
  }

  function stopTicker() {
    clearInterval(tickerIntervalId);
    tickerIntervalId = null;
  }

  function startTicker() {
    stopTicker();
    renderTicker(true);
    tickerIntervalId = setInterval(() => renderTicker(false), 1000);
  }

  const exploreState = { year: currentYear, unit: 'total', subview: 'revenue', selectedSpendingId: null, selectedRevenueId: null };

  function renderExploreView({ treemapId, tableId, items, getColour, selectedId, onSelect }) {
    const shares = sharePercentages(items.map(item => item.selectedYearValue));
    const rows = buildAmountRows(items, getColour, (item, index) => formatUnitText(exploreState.unit, item.selectedYearValue, shares[index]));
    renderTreemap(selectOne(treemapId), rows.map(({ item, colour, amountText }) => createTreemapItem(item, item.selectedYearValue, amountText, colour)), { selectedId, onSelect });
    selectAll('[data-fill="explore-year"]').forEach(fillElement => (fillElement.textContent = budgetData.years[exploreState.year].label));
    const totalText = formatUnitText(exploreState.unit, sumValues(items.map(item => item.selectedYearValue)), 100);
    renderAmountRows(selectOne(tableId), rows, { selectedId, onSelect, totalLabel: 'Total', totalText });
  }

  function renderRevenue() {
    renderExploreView({
      treemapId: '#rv-tree',
      tableId: '#rv-table',
      items: getRevenueItems(exploreState.year),
      getColour: getRevenueItemColour,
      selectedId: exploreState.selectedRevenueId,
      onSelect: revenueItemId => {
        exploreState.selectedRevenueId = revenueItemId;
        renderRevenue();
        openRevenueItemPopup(revenueItemId, exploreState.year);
      }
    });
  }

  function renderSpending() {
    renderExploreView({
      treemapId: '#sp-tree',
      tableId: '#sp-table',
      items: getSpendingItems(exploreState.year),
      getColour: item => getSpendingGroupColour(item.group),
      selectedId: exploreState.selectedSpendingId,
      onSelect: areaId => {
        exploreState.selectedSpendingId = areaId;
        renderSpending();
        openSpendingAreaPopup(areaId, exploreState.year);
      }
    });
  }

  function growBars(scopeElement) {
    const barElements = selectAll('.cb-bar', scopeElement);
    const setFinalWidth = barElement => (barElement.style.width = barElement.style.getPropertyValue('--w'));
    if (!isMotionAllowed()) return barElements.forEach(setFinalWidth);
    barElements.forEach(barElement => (barElement.style.width = '0%'));
    requestAnimationFrame(() => requestAnimationFrame(() => barElements.forEach((barElement, index) => {
      barElement.style.transitionDelay = index * 40 + 'ms';
      setFinalWidth(barElement);
    })));
  }

  function renderChanges() {
    const changeRows = getSpendingItems(currentYear)
      .map(item => ({ item, amountChange: item.currentYearValue - item.previousYearValue, percentChange: ((item.currentYearValue - item.previousYearValue) / item.previousYearValue) * 100 }))
      .sort((first, second) => second.percentChange - first.percentChange);
    const changeList = selectOne('#ch-list');
    changeList.replaceChildren(...changeRows.map(({ item, amountChange, percentChange }) => {
      const halfWidthPercent = Math.min(100, Math.abs(percentChange)) / 2;
      const barElement = createElement('span', {
        class: 'cb-bar' + (isHatchedGroup(item.group) ? ' is-hatched' : '') + (Math.abs(percentChange) > 100 ? ' over' : ''),
        style: { left: (percentChange < 0 ? 50 - halfWidthPercent : 50) + '%', '--w': halfWidthPercent + '%' }
      });
      const labelElement = createElement('span', { class: 'cb-label' },
        createElement('span', { class: 'cell-flex' }, createColourKey(getSpendingGroupColour(item.group), isHatchedGroup(item.group)), item.label),
        createElement('span', { class: 'cb-figs' }, createElement('span', { class: 'small', text: formatBillionsChange(amountChange) }), createElement('b', { text: formatPercentChange(percentChange) })));
      return createElement('li', {}, createElement('button', { type: 'button', class: 'cb-row', style: { '--c': getSpendingGroupColour(item.group) }, onclick: () => openSpendingAreaPopup(item.id) },
        labelElement, createElement('span', { class: 'cb-track', 'aria-hidden': 'true' }, createElement('span', { class: 'cb-zero' }), barElement)));
    }));
    growBars(changeList);
  }

  function renderExplore(subview, queryParams) {
    exploreState.subview = ['revenue', 'spending', 'changes'].includes(subview) ? subview : 'revenue';
    selectAll('.subnav a').forEach(link => (link.dataset.sub === exploreState.subview ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current')));
    selectAll('.subview').forEach(view => (view.hidden = view.id !== 'view-' + exploreState.subview));
    selectOne('#explore-controls').hidden = exploreState.subview === 'changes';
    const isKnownArea = budgetData.spending.concat(budgetData.other).some(area => area.id === queryParams.area);
    if (exploreState.subview === 'spending' && queryParams.area && isKnownArea) exploreState.selectedSpendingId = queryParams.area;
    ({ revenue: renderRevenue, spending: renderSpending, changes: renderChanges })[exploreState.subview]();
  }

  const taxState = { annualTax: 0, income: 0 };
  const PAY_PERIODS = { week: [52, 'Per week'], fortnight: [26, 'Per fortnight'], year: [1, 'Per year'] };

  function getBracketBreakdown(income) {
    return budgetData.brackets.map(([lowerBound, upperBound, taxRate]) => {
      const incomeInBracket = Math.max(0, Math.min(income, upperBound) - lowerBound);
      return { lowerBound, upperBound, taxRate, incomeInBracket, tax: incomeInBracket * taxRate };
    });
  }

  const calculateIncomeTax = income => sumValues(getBracketBreakdown(income).map(bracket => bracket.tax));
  const getMarginalTaxRate = income => (budgetData.brackets.find(([lowerBound, upperBound]) => income > lowerBound && income <= upperBound) || budgetData.brackets[0])[2];

  function readIncome() {
    const errorElement = selectOne('#tax-error');
    errorElement.textContent = '';
    const showIncomeError = message => {
      errorElement.textContent = message;
      return null;
    };
    const isOutOfRange = (value, minimum, maximum) => Number.isNaN(value) || value < minimum || value > maximum;
    if (getSelectedRadioValue('paytype') === 'salary') {
      const salary = parseNumberInput(selectOne('#salary').value);
      if (salary === null) return null;
      return isOutOfRange(salary, 0, 5e6) ? showIncomeError('Enter a yearly salary as a number, like 45000.') : salary;
    }
    const hourlyRate = parseNumberInput(selectOne('#rate').value);
    const weeklyHours = parseNumberInput(selectOne('#hours').value);
    const enteredWeeks = parseNumberInput(selectOne('#weeks').value);
    if (hourlyRate === null || weeklyHours === null) return null;
    if (isOutOfRange(hourlyRate, 0, 1000)) return showIncomeError('Enter your hourly rate as a number, like 23.50.');
    if (isOutOfRange(weeklyHours, 0, 100)) return showIncomeError('Hours a week should be between 0 and 100.');
    const weeksPerYear = enteredWeeks === null ? 52 : enteredWeeks;
    if (isOutOfRange(weeksPerYear, 1, 52)) return showIncomeError('Weeks a year should be between 1 and 52.');
    return hourlyRate * weeklyHours * weeksPerYear;
  }

  function openTaxWorkingPopup() {
    const formatBand = bracket => (bracket.upperBound === Infinity ? 'Over ' + formatDollars(bracket.lowerBound) : formatDollars(bracket.lowerBound) + '-' + formatDollars(bracket.upperBound));
    const createHeaderCell = (text, isNumeric) => createElement('th', { scope: 'col', class: isNumeric ? 'num' : null, text });
    const createNumberCell = text => createElement('td', { class: 'num', text });
    const bracketRows = getBracketBreakdown(taxState.income).map(bracket => createElement('tr', { class: bracket.incomeInBracket > 0 ? 'is-selected' : null },
      createElement('th', { scope: 'row', text: formatBand(bracket) }),
      createNumberCell((bracket.taxRate * 100).toFixed(1).replace('.0', '') + '%'),
      createNumberCell(bracket.incomeInBracket ? formatDollars(bracket.incomeInBracket) : '-'),
      createNumberCell(bracket.incomeInBracket ? formatDollars(bracket.tax) : '-')));
    openPopup({
      kicker: 'Your tax',
      title: 'How your tax is worked out',
      body: [
        'Income tax works in steps. Each part of your income is taxed at its own rate, and the rate goes up as your income goes up.',
        createElement('table', { class: 'data-table' },
          createElement('thead', {}, createElement('tr', {}, createHeaderCell('Income step'), createHeaderCell('Rate', true), createHeaderCell('Your income in it', true), createHeaderCell('Tax', true))),
          createElement('tbody', {}, bracketRows)),
        createParagraph('These sums are exact for the pay you entered. Elsewhere we round them, because your real tax also depends on things this estimate leaves out.', 'small')
      ]
    });
  }

  function renderTaxShare() {
    const spendingItems = getSpendingItems(currentYear);
    const totalSpending = budgetData.years[currentYear].spending;
    const [periodsPerYear, columnHeading] = PAY_PERIODS[getSelectedRadioValue('period')];
    const getTaxForArea = item => (taxState.annualTax * item.selectedYearValue) / totalSpending / periodsPerYear;
    const rows = buildAmountRows(spendingItems, item => getSpendingGroupColour(item.group), item => formatApproximateDollars(getTaxForArea(item)));
    renderTreemap(selectOne('#tax-tree'), rows.map(({ item, colour, amountText }) => createTreemapItem(item, item.selectedYearValue, amountText, colour)), { onSelect: openSpendingAreaPopup });
    selectOne('#tax-col').textContent = columnHeading;
    renderAmountRows(selectOne('#tax-table'), rows, { onSelect: openSpendingAreaPopup, totalLabel: 'Your income tax', totalText: formatApproximateDollars(taxState.annualTax / periodsPerYear) });
    const secondsOfSpending = taxState.annualTax / ((totalSpending * 1e6) / SECONDS_PER_YEAR);
    const roundedSeconds = Math.round(secondsOfSpending);
    const secondsText = secondsOfSpending < 0.1 ? 'under a tenth of a second' : secondsOfSpending < 1 ? secondsOfSpending.toFixed(1) + ' seconds' : roundedSeconds + (roundedSeconds === 1 ? ' second' : ' seconds');
    selectOne('#tax-scale').textContent = 'Your whole year of income tax is about the same as ' + secondsText + ' of government spending. It adds up because millions of people pay tax.';
  }

  function renderTax() {
    const income = readIncome();
    const resultElement = selectOne('#tax-result');
    const shareSection = selectOne('#tax-share');
    if (!income) {
      shareSection.hidden = true;
      return resultElement.replaceChildren(createParagraph('Fill in your pay to see your tax here.', 'empty-state'));
    }
    const annualTax = calculateIncomeTax(income);
    taxState.annualTax = annualTax;
    taxState.income = income;
    resultElement.replaceChildren(
      createParagraph(formatApproximateDollarPhrase(annualTax) + ' a year', 'result-big'),
      createFactList([['Weekly', formatApproximateDollars(annualTax / 52)], ['Fortnightly', formatApproximateDollars(annualTax / 26)], ['Yearly', formatApproximateDollars(annualTax)]]),
      createParagraph('On average, about ' + Math.round((annualTax / income) * 100) + 'c of every dollar you earn goes to income tax. For each extra dollar you earn, ' + Math.round(getMarginalTaxRate(income) * 1000) / 10 + 'c goes to tax.'),
      createElement('button', { type: 'button', class: 'btn-small', onclick: openTaxWorkingPopup }, 'How is this worked out?')
    );
    shareSection.hidden = false;
    renderTaxShare();
  }

  function renderGst() {
    const spendAmount = parseNumberInput(selectOne('#spend').value);
    const resultElement = selectOne('#gst-result');
    if (spendAmount === null) return (resultElement.textContent = '');
    if (Number.isNaN(spendAmount) || spendAmount < 0) return (resultElement.textContent = 'Enter an amount as a number, like 50.');
    const gstAmount = (spendAmount * budgetData.gstRate) / (1 + budgetData.gstRate);
    const gstText = formatApproximateDollarPhrase(gstAmount);
    resultElement.textContent = gstText.charAt(0).toUpperCase() + gstText.slice(1) + ' of that is GST, which adds up to ' + formatApproximateDollarPhrase(gstAmount * 52) +
      ' a year. It is less than 15% of what you spend because GST is added on top of the price before tax: something that costs $87 before GST costs $100 once 15% is added.';
  }


  function renderSources() {
    selectAll('[data-source]').forEach(paragraph => {
      const sourceList = (budgetData.sources || {})[paragraph.dataset.source] || [];
      paragraph.replaceChildren('Source: ', ...(sourceList.length ? createSourceNodes(sourceList).flat() : ['to come']));
    });
    const uniqueSources = [].concat(...Object.values(budgetData.sources || {})).filter((source, index, allSources) => allSources.findIndex(other => other.text === source.text) === index);
    selectOne('#source-list').replaceChildren(...uniqueSources.map(source => createElement('li', {}, createSourceNodes([source]).flat())));
    selectOne('#source-empty').hidden = uniqueSources.length > 0;
  }

  function createInlineNodes(text) {
    const nodes = [];
    const inlinePattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*([^*]+)\*/g;
    let lastIndex = 0;
    let match;
    while ((match = inlinePattern.exec(text))) {
      if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
      nodes.push(match[3] === undefined
        ? createElement('a', { href: match[2], target: '_blank', rel: 'noopener', text: match[1] })
        : createElement('em', { text: match[3] }));
      lastIndex = inlinePattern.lastIndex;
    }
    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
    return nodes;
  }

  function createRichTextNodes(sourceText) {
    const nodes = [];
    String(sourceText).split(/\n\s*\n/).forEach(block => {
      let bulletList = null;
      block.split('\n').map(line => line.trim()).filter(Boolean).forEach(line => {
        if (!line.startsWith('- ')) {
          bulletList = null;
          return nodes.push(createElement('p', {}, createInlineNodes(line)));
        }
        if (!bulletList) nodes.push((bulletList = createElement('ul')));
        bulletList.append(createElement('li', {}, createInlineNodes(line.slice(2))));
      });
    });
    return nodes;
  }

  function renderHelp() {
    const faqList = selectOne('#faq-list');
    if (faqList && !faqList.childElementCount && (budgetData.faqs || []).length) {
      budgetData.faqs.forEach(faq => faqList.append(createElement('details', { class: 'faq' }, createElement('summary', { text: faq.q }), createElement('div', { class: 'faq-a' }, createRichTextNodes(faq.a)))));
      selectOne('#faq-empty').hidden = true;
    }
    const glossaryList = selectOne('#glossary');
    if (glossaryList.childElementCount) return;
    budgetData.glossary.forEach(term => glossaryList.append(createElement('dt', { id: 'term-' + term.id, text: term.term }), createElement('dd', { text: term.def })));
  }

  const PAGE_NAMES = ['overview', 'explore', 'tax', 'build', 'help'];
  let isFirstRoute = true;

  function parseAddress() {
    const [path, queryString] = location.hash.replace(/^#\/?/, '').split('?');
    const [page, subview] = path.split('/');
    return { page: page || 'overview', subview, queryParams: Object.fromEntries(new URLSearchParams(queryString || '')) };
  }

  function closeMenu() {
    selectOne('#site-nav').classList.remove('open');
    selectOne('#menu-btn').setAttribute('aria-expanded', 'false');
  }

  function route() {
    closePopup();
    const { page: requestedPage, subview, queryParams } = parseAddress();
    const page = PAGE_NAMES.includes(requestedPage) ? requestedPage : 'overview';
    const pageElement = selectOne('#page-' + page);
    selectAll('.page').forEach(element => (element.hidden = element.id !== 'page-' + page));
    selectAll('[data-nav]').forEach(link => (link.dataset.nav === page ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current')));
    document.title = pageElement.dataset.title + ' - Parliamentary Library';
    closeMenu();
    if (page === 'overview') renderOverview();
    if (page === 'explore') {
      renderExplore(subview, queryParams);
      document.title = selectOne('#view-' + exploreState.subview + ' h2').textContent + ' - ' + document.title;
    }
    if (page === 'explore' && exploreState.subview === 'spending') {
      if (selectOne('.ticker').classList.contains('is-in')) startTicker();
    } else stopTicker();
    if (page === 'tax') renderTax();
    if (page === 'help') renderHelp();
    if (page === 'build') window.BudgetBuilder.routeToBuildPage(queryParams);
    if (!isFirstRoute && !queryParams.focus) {
      window.scrollTo(0, 0);
      selectOne('h1', pageElement).focus({ preventScroll: true });
    }
    if (isMotionAllowed()) {
      pageElement.classList.remove('page-enter');
      void pageElement.offsetWidth;
      pageElement.classList.add('page-enter');
    }
    requestAnimationFrame(() => setupReveal(pageElement));

    if (page === 'overview' && !hasSeenOverviewWelcome) {
      hasSeenOverviewWelcome = true;
      setTimeout(() => openPopup(OVERVIEW_POPUP), 150);
    }

    isFirstRoute = false;
  }

  function bindGeneralControls() {
    window.addEventListener('hashchange', route);
    selectOne('#menu-btn').addEventListener('click', () => selectOne('#menu-btn').setAttribute('aria-expanded', String(selectOne('#site-nav').classList.toggle('open'))));
    const informationPopups = { population: openPerPersonPopup,'the-gap': openGapPopup };
    document.addEventListener('click', event => {
      const termElement = event.target.closest('[data-term]');
      const informationElement = event.target.closest('[data-info]');
      if (termElement) openGlossaryTermPopup(termElement.dataset.term);
      if (informationElement && informationPopups[informationElement.dataset.info]) informationPopups[informationElement.dataset.info]();
    });
    Object.entries(STATIC_POPUPS).forEach(([buttonId, popupContent]) => selectOne('#' + buttonId).addEventListener('click', () => openPopup(popupContent)));
  }

  function bindOverviewAndExploreControls() {
    addListeners('input[name="ov-unit"]', 'change', renderOverview);
    addListeners('input[name=tick]', 'change', () => renderTicker(true));
    addListeners('#explore-controls input', 'change', () => {
      exploreState.year = getSelectedRadioValue('year');
      exploreState.unit = getSelectedRadioValue('unit');
      ({ revenue: renderRevenue, spending: renderSpending, changes: renderChanges })[exploreState.subview]();
    });
  }

  function bindTaxControls() {
    addListeners('input[name=paytype]', 'change', event => {
      if (!event.target.checked) return;
      selectOne('#hourly-fields').hidden = event.target.value === 'salary';
      selectOne('#salary-fields').hidden = event.target.value !== 'salary';
      renderTax();
    });
    ['#rate', '#hours', '#weeks', '#salary'].forEach(selector => selectOne(selector).addEventListener('input', renderTax));
    addListeners('input[name=period]', 'change', renderTaxShare);
    selectOne('#spend').addEventListener('input', renderGst);
  }

  fillStaticValues();
  renderSources();
  renderLegends();
  bindGeneralControls();
  bindOverviewAndExploreControls();
  bindTaxControls();
  window.BudgetBuilder.init();
  route();
})();