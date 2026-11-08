/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      utility_functions.js
Purpose:     Provides shared functionality.
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/
'use strict';
window.UtilityHelpers = (() => {
// window.BudgetCalculations.calculatePerPersonAmount(amount, window.youthBudgetMetadata?.population || 0)
  //==========================================================================
  // DOM helpers
  //==========================================================================
  // Returns the first element matching a selector.
  const selectOne = (selector, parentElement = document) => parentElement.querySelector(selector);
  // Returns all elements matching a selector as an array.
  const selectAll = (selector, parentElement = document) => [...parentElement.querySelectorAll(selector)];

  // Creates an element, applies properties, and appends children.
  function createElement(tagName, properties = {}, ...children) {
    const element = document.createElement(tagName);
    Object.entries(properties).forEach(([propertyName, propertyValue]) => {
      if (propertyName === 'class') element.className = propertyValue;
      else if (propertyName === 'text') element.textContent = propertyValue;
      else if (propertyName === 'style') {
        Object.entries(propertyValue).forEach(([cssName, cssValue]) => element.style.setProperty(cssName, cssValue));
      } else if (propertyName.startsWith('on')) element.addEventListener(propertyName.slice(2), propertyValue);
      else if (propertyValue !== false && propertyValue != null) {
        element.setAttribute(propertyName, propertyValue === true ? '' : propertyValue);
      }
    });
    children.flat(Infinity).forEach(child => child != null && child !== false && element.append(child));
    return element;
  }

  //==========================================================================
  // Colour helpers
  //==========================================================================
  // Resolves a CSS colour value to its computed RGB value.
  function resolveColour(cssColour) {
    const probe = document.createElement('span');
    probe.style.color = cssColour;
    document.body.append(probe);
    const rgb = getComputedStyle(probe).color;
    probe.remove();
    return rgb;
  }

  const darkColourCache = {};
  // Returns whether a CSS colour is dark enough to need light foreground text.
  function isDarkColour(cssColour) {
    if (cssColour in darkColourCache) return darkColourCache[cssColour];
    const [red, green, blue] = resolveColour(cssColour).match(/\d+(\.\d+)?/g).map(Number);
    const toLinear = channel => ((channel /= 255) <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);
    return (darkColourCache[cssColour] = luminance < 0.18);
  }


  const dashboardDisplayOptions = { includeTransfers: false };
    try {
      dashboardDisplayOptions.includeTransfers = localStorage.getItem('bd-include-transfers') === '1';
    } catch (error) {}

  function updateDashboardDisplayOption(optionName, optionValue) {
    dashboardDisplayOptions[optionName] = optionValue;
  try {
    localStorage.setItem('bd-' + optionName, optionValue ? '1' : '0');
  } catch (error) {}
}

  //==========================================================================
  // General formatters
  //==========================================================================
  // Formats a number using New Zealand number formatting.
  // Applies a negative sign to an already-formatted value.
  const nz = (n, dp = 0) => Number(n).toLocaleString('en-NZ', { minimumFractionDigits: dp, maximumFractionDigits: dp });

  const minus = (n, s) => (n < 0 ? '-' + s : s);

  const billions = (k, long) => minus(k, '$' + nz(Math.abs(k) / 1e6, 1) + (long ? ' billion' : 'b'));

  function millions(k) {
    const m = Math.abs(k) / 1e3;
    return minus(k, '$' + nz(m, m < 100 ? 1 : 0) + 'm');
  }

  const money = k => (Math.abs(k) >= 1e6 ? billions(k) : millions(k));

  const thousands = k => (k == null ? '-' : minus(k, nz(Math.abs(k))));

  const signedMoney = k => (k > 0 ? '+' : '') + money(k);

  function pct(p) {
    if (p == null || !Number.isFinite(p)) return '-';
    const a = Math.abs(p);
    if (a < 0.05) return '0.0%';
    return (p > 0 ? '+' : '-') + nz(a, a < 10 ? 1 : 0) + '%';
  }

  /* ======================================================== END BUDGET MONEY FORMATTERS */
  function share(part, whole) {
    if (!whole) return '-';
    const percentage = (part / whole) * 100;
    return percentage > 0 && percentage < 0.05 ? 'under 0.1%' : nz(percentage, 1) + '%';
  }
  const today = () => new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' });
  const slug = text => String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const formatBillions = amount => '$' + (amount / 1000).toFixed(1) + 'b';
  const formatBillionsLong = amount => '$' + (amount / 1000).toFixed(1) + ' billion';
  const formatMillions = amount => (amount >= 1000 ? formatBillions(amount) : '$' + Math.round(amount) + 'm');
  const formatDollars = amount => '$' + Math.round(amount).toLocaleString('en-NZ');
  const formatSigned = (formattedValue, value) => (value > 0 ? '+' : value < 0 ? '-' : '') + formattedValue;
  const formatBillionsChange = amount => formatSigned(formatBillions(Math.abs(amount)), Math.round(amount / 100));
  const formatPercentChange = percentage => formatSigned(Math.abs(percentage).toFixed(Math.abs(percentage) < 10 ? 1 : 0) + '%', percentage);
  const roundToStep = (value, step) => Math.round(value / step) * step;
  const formatApproximateDollarPhrase = amount => (amount < 1 ? '' : 'about ') + formatApproximateDollars(amount);

  function formatApproximateDollars(amount) {
    if (amount < 1) return 'under $1';
    return formatDollars(amount < 20 ? amount : roundToStep(amount, amount < 200 ? 5 : 10));
  }

  function parseNumberInput(value) {
    const cleanedValue = String(value).replace(/[$,\s]/g, '');
    if (cleanedValue === '') return null;
    return Number.isFinite(Number(cleanedValue)) ? Number(cleanedValue) : NaN;
  }

  function formatUnitText(unit, amount, shareOfHundred) {
    if (unit === 'hundred') return shareOfHundred < 1 ? 'under $1' : '$' + shareOfHundred;
    return unit === 'person' ? formatDollars(roundToStep(window.BudgetCalculations.calculatePerPersonAmount(amount, window.youthBudgetMetadata?.population || 0), 10)) : formatBillions(amount);  }

  const getSpendingGroupColour = groupId => 'var(--g-' + groupId + ')';
  const getRevenueGroupColour = groupId => 'var(--r-' + groupId + ')';
  const getRevenueItemColour = revenueItem => 'var(--' + revenueItem.tone + ')';
  const isHatchedGroup = groupId => groupId === 'other';
  const isMotionAllowed = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const getSelectedRadioValue = radioName => (selectOne('input[name="' + radioName + '"]:checked') || {}).value;
  const addListeners = (selector, eventName, handler) => selectAll(selector).forEach(element => element.addEventListener(eventName, handler));
  const sumValues = values => values.reduce((runningTotal, value) => runningTotal + value, 0);
  const createTreemapItem = (item, value, text, colour) => ({ id: item.id, label: item.label, value, text, colour, hatched: isHatchedGroup(item.group) });
  function csvCell(value) {
    const cellText = value == null ? '' : String(value);
    return /[",\n]/.test(cellText) ? '"' + cellText.replace(/"/g, '""') + '"' : cellText;
  }
  function toCSV(columns, rows) { return [columns.map(column => csvCell(column.label)).join(',')].concat(rows.map(row => columns.map(column => csvCell(column.csv(row))).join(','))).join('\r\n'); }
  function download(filename, text) {
    const blob = new Blob(['' + text], { type: 'text/csv;charset=utf-8' });
    const link = createElement('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  // Copies text to the clipboard and reports whether it worked.
  async function copyText(text) { try { await navigator.clipboard.writeText(text); return true; } catch (error) { return false; } }
 

  const utilityHelpers = {
    selectOne,
    selectAll,
    createElement,
    resolveColour,
    isDarkColour,
    minus,
    share,
    today,
    slug,
    billions,
    millions,
    money,
    thousands,
    signedMoney,
    pct,
    nz,
    formatBillions,
    formatBillionsLong,
    formatMillions,
    formatDollars,
    formatSigned,
    formatBillionsChange,
    formatPercentChange,
    roundToStep,
    formatApproximateDollars,
    formatApproximateDollarPhrase,
    parseNumberInput,
    formatUnitText,
    getSpendingGroupColour,
    getRevenueGroupColour,
    getRevenueItemColour,
    isHatchedGroup,
    isMotionAllowed,
    getSelectedRadioValue,
    addListeners,
    sumValues,
    createTreemapItem,
    toCSV,
    download,
    copyText,
    dashboardDisplayOptions,
    updateDashboardDisplayOption,

  };

  window.UtlityFunctions = utilityHelpers;
  window.YouthFormat = utilityHelpers;
  return utilityHelpers;
})();

window.UtilityHelpers = window.UtilityHelpers || window.UtlityFunctions;
  //==========================================================================
  // Navigation menu label updater
  //==========================================================================
(() => {
  const menuCurrentLabel = document.getElementById('menu-current');
  const siteNavigation = document.getElementById('site-nav');
  if (!menuCurrentLabel || !siteNavigation) return;

  function updateMenuLabel() {
    const currentLink = siteNavigation.querySelector('[aria-current="page"]');
    if (currentLink) menuCurrentLabel.textContent = currentLink.textContent;
  }

  new MutationObserver(updateMenuLabel).observe(siteNavigation, { attributes: true, attributeFilter: ['aria-current'], subtree: true });
  updateMenuLabel();
})();

  //==========================================================================
  // Top navigation menu
  //==========================================================================
(() => {
  const topNavigation = document.getElementById('top-nav');
  const topMenuButton = document.getElementById('top-menu-btn');
  const topMenuCurrentLabel = document.getElementById('top-menu-current');
  if (!topNavigation || !topMenuButton || !topMenuCurrentLabel) return;

  const activeTopLink = topNavigation.querySelector('a.is-active');
  if (activeTopLink) topMenuCurrentLabel.textContent = activeTopLink.textContent;

  topMenuButton.addEventListener('click', () => {
    const isTopMenuOpen = topNavigation.classList.toggle('open');
    topMenuButton.setAttribute('aria-expanded', String(isTopMenuOpen));
  });
})();

  //==========================================================================
  // re-measures whenever the header changes size
  //==========================================================================
(() => {
  const siteHeaderElement = document.querySelector('.site-header');
  if (!siteHeaderElement) return;

  function updateSiteHeaderHeight() {
    const siteHeaderHeight = siteHeaderElement.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--site-header-height', siteHeaderHeight + 'px');
  }

  new ResizeObserver(updateSiteHeaderHeight).observe(siteHeaderElement);
  updateSiteHeaderHeight();
})();


  //==========================================================================
  // Sub-navigation: switch to the condensed menu when the tabs do not fit
  //==========================================================================
(() => {
  const subHeaderElement = document.querySelector('.sub-header');
  const subHeaderInnerElement = subHeaderElement && subHeaderElement.querySelector('.header-inner');
  const siteNavigationElement = document.getElementById('site-nav');
  const subNavigationListElement = siteNavigationElement && siteNavigationElement.querySelector('ul');
  if (!subHeaderElement || !subHeaderInnerElement || !subNavigationListElement) return;

  const PHONE_MAXIMUM_WIDTH = 640;
  const TAB_GAP_WIDTH = 2;

  function updateSubNavigationLayout() {
    subHeaderElement.classList.remove('is-condensed');

    const tabElements = Array.from(subNavigationListElement.children);
    const tabsTotalWidth = tabElements.reduce((runningTotal, tabElement) => runningTotal + tabElement.getBoundingClientRect().width + TAB_GAP_WIDTH, 0);
    const availableWidth = subHeaderElement.clientWidth;
    const tabsDoNotFit = tabsTotalWidth > availableWidth;
    const isPhoneWidth = window.innerWidth <= PHONE_MAXIMUM_WIDTH;

    subHeaderElement.classList.toggle('is-condensed', tabsDoNotFit || isPhoneWidth);
  }

  window.addEventListener('resize', updateSubNavigationLayout);
  if (document.fonts) document.fonts.ready.then(updateSubNavigationLayout);
  updateSubNavigationLayout();
})();