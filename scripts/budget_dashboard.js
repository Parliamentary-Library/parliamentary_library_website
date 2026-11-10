/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      budget_dashboard.js
Purpose:     Main functionlity for the budget dashboard.
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/
'use strict';
(() => {
const budgetModel = window.UtilityHelpers;
const budgetSourceData = window.BUDGET_DATA;
const budgetReference = window.BUDGET_REF;
const {selectOne, selectAll, createElement, dashboardDisplayOptions, updateDashboardDisplayOption,
  money: formatMoney, billions: formatBillions, 
  thousands: formatThousands, pct: formatPercentage, nz: formatNumber} = budgetModel;
const budgetCalculations = window.BudgetCalculations;
const { renderTreemap } = window.TreeMapCreator;
const { createColourKey, renderLegend, renderBars, renderChangeBars, renderColumnChart, renderLifecycleBar } = window.ChartTools;
const { createTableState, renderTable, renderPager, uniqueSortedValues, fillSelectOptions, rowMatchesSearch, downloadTableCsv, 
  renderChartTableTools } = window.TableTools;
const { downloadCsv } = window.CsvTools;
const chartTooltip = window.TooltipTools.createTooltip({ placement: 'auto' });
const currentYear = budgetSourceData.budgetYear;
const previousYear = budgetSourceData.previousYear;
const glossaryDialog = selectOne('#pop');
const itemDialog = selectOne('#item-pop');
const APPROPRIATION_TYPE_NAMES = {
  'Output Expenses': 'Output expenses',
  'Benefits or Related Expenses': 'Benefits and related expenses',
  'Other Expenses': 'Other expenses',
  'Capital Expenditure': 'Capital expenditure',
  'Borrowing Expenses': 'Borrowing expenses',
  'Intelligence and Security Department Expenses and Capital Expenditure': 'Intelligence and security'
};
const REVEAL_SELECTOR = '.hero, .notice, .about-figures, .stat-cards, .controls-bar, .section-block, .link-list li, .notes, .article > section, .page-head, .filters, .table-scroll, .key-explain';

const replaceAddressBar = address => { try { history.replaceState(null, '', address); } catch (error) {} };
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const replaceElementChildren = (parentElement, ...children) => parentElement.replaceChildren(...children.flat(Infinity).filter(child => child != null && child !== false));
const sumAmounts = (rows, getAmount) => rows.reduce((runningTotal, row) => runningTotal + getAmount(row), 0);
const compareByBudgetDescending = (first, second) => (second.budget || 0) - (first.budget || 0);
const findMinister = ministerCode => budgetReference.ministers[ministerCode];
const findDepartment = departmentCode => budgetReference.departments[departmentCode];
const getTypeDisplayName = typeName => APPROPRIATION_TYPE_NAMES[typeName] || typeName;
const createLink = (href, text) => createElement('a', { href, text });
const createSourceLink = source => createLink(source.url, source.title + (source.publisher ? ' - ' + source.publisher : '') + (source.date ? ', ' + source.date : ''));
const createSectorTag = sector => createElement('span', { class: 'sector-tag' }, createColourKey(sector.colour), sector.name);
const createSection = (title, ...children) => createElement('section', { class: 'section-block' }, createElement('h2', { text: title }), children);
// const createKeyFigure = (label, valueText, subText) => createElement('div', {}, createElement('dt', { text: label }), createElement('dd', {}, createElement('b', { text: valueText }), subText ? createElement('span', { text: subText }) : null));
const createStatCard = (titleText, yearText, valueText, unitText) => createElement('article', { class: 'stat-card' },
  createElement('h3', { class: 'stat-title', text: titleText }),
  createElement('p', { class: 'stat-year', text: yearText }),
  createElement('p', { class: 'stat-value', text: valueText }),
  createElement('p', { class: 'stat-unit', text: unitText || '' }));
const createStatCards = (...statCards) => createElement('div', { class: 'stat-cards' }, statCards);
const createSourceFooter = (voteName) => createElement('p', { class: 'source' }, 'Source: ', createSourceLink(budgetReference.sources.estimates), voteName ? ', Vote ' + voteName + '.' : '');
const createScrollableTable = (tableId, captionText) => createElement('div', { class: 'table-scroll', tabindex: '0' }, createElement('table', { class: 'data-table', id: tableId }, createElement('caption', { class: 'sr-only', text: captionText })));
const createChartFigure = (chartId, captionText) => createElement('figure', { class: 'chart' }, createElement('figcaption', { class: 'chart-caption', text: captionText }), createElement('div', { class: 'chart-body', id: chartId }), createElement('div', { class: 'chart-foot', 'data-chart-tools': chartId }));
const createVoteLink = voteName => (budgetCalculations.voteByName.get(voteName) ? createLink('#/vote/' + budgetCalculations.voteByName.get(voteName).id, voteName) : voteName);
const createLabelTag = (className, text, glossaryTerm) => createElement('span', { class: 'tag tag-' + className }, glossaryTerm ? createElement('button', { type: 'button', class: 'tag-term', 'data-term': glossaryTerm, text }) : text);
const getAppropriationRowClass = appropriation => (appropriation.kind === 'mca' ? 'is-mca' : appropriation.kind === 'category' ? 'is-category' : '') + (appropriation.transfer && !budgetModel.dashboardDisplayOptions.includeTransfers ? ' is-muted' : '') || null;
const createGlossaryTermButton = (termId, className, text) => createElement('button', { type: 'button', class: className, 'data-term': termId, text });

const createAmountColumn = (key, label, getAmount) => ({ key, label, isNumeric: true, value: row => formatThousands(getAmount(row)), csv: getAmount });
const createOptionalAmountColumn = (label, getAmount) => ({ label, isNumeric: true, value: row => (getAmount(row) ? formatThousands(getAmount(row)) : '-'), csv: getAmount });
const createMillionsColumn = (key, label, getAmount) => ({ key, label, isNumeric: true, value: row => formatNumber(getAmount(row) / 1000, 1), sortValue: getAmount, csv: row => (getAmount(row) / 1000).toFixed(1) });
const createLinkColumn = (key, label, getText, getHref) => ({ key, label, value: row => createLink(getHref(row), getText(row)), csv: getText });
const createShareColumn = (getAmount, totalAmount) => ({ key: 'share', label: 'Share', isNumeric: true, value: row => budgetModel.share(getAmount(row), totalAmount), sortValue: getAmount, csv: row => ((getAmount(row) / totalAmount) * 100).toFixed(2) });
const formatThousandsTooltip = row => row.label + ': ' + row.valueText + ' ($000)';
const formatThousandsChangeTooltip = row => formatThousandsTooltip(row) + (row.subLabel ? ', ' + row.subLabel : '');
const calculatePercentChange = (currentAmount, previousAmount) => (previousAmount ? ((currentAmount - previousAmount) / previousAmount) * 100 : null);
const formatOptionalPercentChange = percentChange => (percentChange === null ? '-' : formatPercentage(percentChange));
const toTwoDecimalPlaces = percentChange => (percentChange === null ? '' : percentChange.toFixed(2));

const menuButtonElement = document.getElementById('menu-btn');
const siteNavigationElement = document.getElementById('site-nav');

menuButtonElement.addEventListener('click', () => {
  const isNavigationOpen = siteNavigationElement.classList.toggle('open');
  menuButtonElement.setAttribute('aria-expanded', String(isNavigationOpen));
});

window.addEventListener('hashchange', () => {
  siteNavigationElement.classList.remove('open');
  menuButtonElement.setAttribute('aria-expanded', 'false');
});

function createAppropriationNameCell(appropriation, options = {}) {
  const isMultiYear = budgetCalculations.multiYearAppropriationById.has(appropriation.id);
  const labelTags = [
    appropriation.kind === 'mca' && createLabelTag('mca', 'MCA', 'mca'),
    appropriation.kind === 'category' && createLabelTag('cat', 'MCA category', 'mcacategory'),
    isMultiYear && createLabelTag('mya', 'Multi-year', 'mya'),
    appropriation.transfer && createLabelTag('transfer', 'Transfer', 'transfer')
  ].filter(Boolean);
  const parentNote = options.showParent && appropriation.kind === 'category' ? createElement('span', { class: 'cell-sub', text: 'Part of ' + appropriation.parent }) : null;
  return createElement('span', { class: 'cell-stack' }, createLink((isMultiYear ? '#/mya/' : '#/appropriation/') + appropriation.id, appropriation.name), parentNote, labelTags.length ? createElement('span', { class: 'tags' }, labelTags) : null);
}

function openGlossaryTerm(termId) {
  const glossaryEntry = budgetReference.glossary.find(entry => entry.id === termId);
  if (!glossaryEntry) return;
  selectOne('#pop-title').textContent = glossaryEntry.term;
  replaceElementChildren(selectOne('#pop-body'), createElement('p', { text: glossaryEntry.def }), createElement('p', { class: 'small' }, createLink('#/help#glossary', 'All glossary terms')));
  glossaryDialog.showModal();
}

  function fillPagePlaceholders() {
    const totals = budgetCalculations.totalAmounts;
    const siteDetails = budgetReference.site;
    const placeholderValues = {
      'total-all': formatBillions(totals.all, true),
      'total-ex': formatBillions(totals.all - totals.transfers, true),
      'transfer-amount': formatBillions(totals.transfers, true),
      'largest-transfer': formatBillions(totals.largestTransfer, true),
      'per-person': '$' + formatNumber(Math.round(budgetCalculations.calculatePerPersonAmount(totals.all - totals.transfers, budgetReference.population) / 1000)),      revenue: formatBillions(totals.revenue, true),
      tax: formatBillions(totals.tax, true),
      'vote-count': String(budgetCalculations.votes.length),
      published: siteDetails.published,
      updated: siteDetails.updated,
      email: siteDetails.contactEmail
    };
    selectAll('[data-fill]').forEach(element => { if (element.dataset.fill in placeholderValues) element.textContent = placeholderValues[element.dataset.fill]; });
    selectAll('[data-fill-href=mailto]').forEach(link => (link.href = 'mailto:' + siteDetails.contactEmail));
    selectAll('[data-source-link]').forEach(link => { const source = budgetReference.sources[link.dataset.sourceLink]; if (source) link.href = source.url; });
    selectAll('[data-source]').forEach(paragraph => replaceElementChildren(paragraph, 'Source: ', createSourceLink(budgetReference.sources[paragraph.dataset.source])));
  }

  function renderCitation() {
    selectAll('[data-cite]').forEach(citationBox => {
      const citationText = budgetReference.site.citation.replace('{date}', budgetModel.today());
      const messageElement = createElement('span', { class: 'copy-msg', role: 'status' });
      const copyCitation = async () => { messageElement.textContent = (await budgetModel.copyText(citationText)) ? 'Copied.' : 'Select the text and copy it.'; };
      replaceElementChildren(citationBox, createElement('p', { class: 'cite-label', text: 'Cite this dashboard' }), createElement('p', { class: 'cite-text', text: citationText }),
        createElement('div', { class: 'button-row' }, createElement('button', { type: 'button', class: 'btn-small', text: 'Copy citation', onclick: copyCitation }), messageElement));
    });
  }

  const syncTransferCheckboxes = () => selectAll('[data-setting=transfers]').forEach(checkbox => (checkbox.checked = budgetModel.dashboardDisplayOptions.includeTransfers));

  function createAboutBox(headingId) {
    const aboutContent = budgetReference.about;
    const createColumn = (title, items, className) => createElement('div', { class: 'about-col ' + className }, createElement('h3', { text: title }), createElement('ul', {}, items.map(item => createElement('li', { text: item }))));
    return createElement('aside', { class: 'about-figures', 'aria-labelledby': headingId },
      createElement('h2', { id: headingId, class: 'about-title', text: aboutContent.title }),
      createElement('div', { class: 'about-cols' }, createColumn('What this dashboard shows', aboutContent.shows, 'is-shows'), createColumn("What it doesn't show", aboutContent.doesNotShow, 'is-not')),
      createElement('p', { class: 'about-source' }, 'Source: ', createSourceLink(budgetReference.sources.estimates), '. ', createLink(budgetReference.sources.budget.url, 'Budget Economic and Fiscal Update 2026'), ' for the surplus or deficit.'));
  }

  function renderAboutBox() {
    const readingHeading = selectOne('#reading-h');
    if (readingHeading && !selectOne('#about-figures-help')) readingHeading.after(createAboutBox('about-figures-help'));
  }

  function buildOverviewItems(groupBy) {
    if (groupBy === 'sector') {
      const amountBySectorId = {};
      budgetCalculations.votes.forEach(vote => (amountBySectorId[vote.sector.id] = (amountBySectorId[vote.sector.id] || 0) + budgetCalculations.calculateVoteTotal(vote)));
      return budgetReference.sectors.map(sector => ({ id: sector.id, label: sector.name, value: amountBySectorId[sector.id] || 0, colour: sector.colour, href: '#/votes?sector=' + sector.id }));
    }
    return budgetCalculations.votes.map(vote => ({ id: vote.id, label: vote.name, value: budgetCalculations.calculateVoteTotal(vote), colour: vote.sector.colour, href: '#/vote/' + vote.id }));
  }

  function renderOverviewTreemap() {
    const groupBy = (selectOne('input[name="ov-group"]:checked') || {}).value || 'vote';
    const items = buildOverviewItems(groupBy).sort((first, second) => second.value - first.value);
    const totalAmount = sumAmounts(items, item => item.value);
    items.forEach(item => {
      item.text = budgetModel.millions(item.value);
      const matchingSector = budgetReference.sectors.find(sector => sector.colour === item.colour);
      item.groupLabel = groupBy === 'vote' && matchingSector ? matchingSector.name : '';
      item.tooltip = `${item.label}: ${budgetModel.millions(item.value)}, ${budgetModel.share(item.value, totalAmount)} of the total`;
    });
    renderTreemap(selectOne('#ov-treemap'), items);
    // renderLegend(selectOne('#sector-legend'), budgetReference.sectors.map(sector => ({ label: sector.name, colour: sector.colour })));
    renderChartTableTools({
      id: 'ov-treemap',
      filename: `appropriations-by-${groupBy}-2026-27.csv`,
      rows: items,
            columns: [createLinkColumn('label', groupBy === 'sector' ? 'Sector' : 'Vote', item => item.label, item => item.href), createMillionsColumn('value', '2026/27 ($m)', item => item.value), createShareColumn(item => item.value, totalAmount)]
    });
  }

  function renderOverviewTypeBars() {
    const typeRows = budgetCalculations.getAppropriationsByType();
    const typesTotal = sumAmounts(typeRows, typeRow => typeRow.value);
    renderBars(selectOne('#ov-types'), typeRows.map(typeRow => ({
      label: getTypeDisplayName(typeRow.category),
      value: typeRow.value,
      valueText: formatThousands(typeRow.value),
      glossaryTerm: typeRow.term,
      tooltip: `${getTypeDisplayName(typeRow.category)}: ${formatThousands(typeRow.value)} ($000), ${budgetModel.share(typeRow.value, typesTotal)} of the total`
    })));
    renderChartTableTools({
      id: 'ov-types',
      filename: 'appropriations-by-type-2026-27.csv',
      rows: typeRows,
      columns: [{ label: 'Type', value: typeRow => getTypeDisplayName(typeRow.category) }, createAmountColumn('value', '2026/27 ($000)', typeRow => typeRow.value), createShareColumn(typeRow => typeRow.value, typesTotal)]
    });
  }

  function renderOverviewLargestBars() {
    const largestAppropriations = budgetCalculations.topLevelAppropriations.filter(budgetCalculations.isAppropriationIncluded).slice().sort(compareByBudgetDescending).slice(0, 10);
    const largestTotal = sumAmounts(largestAppropriations, appropriation => appropriation.budget);
    selectAll('[data-fill=top10-share]').forEach(element => (element.textContent = budgetModel.share(largestTotal, budgetCalculations.totalAmounts.spending)));
    renderBars(selectOne('#ov-largest'), largestAppropriations.map(appropriation => ({
      label: appropriation.name,
      subLabel: 'Vote ' + appropriation.vote,
      value: appropriation.budget,
      valueText: formatThousands(appropriation.budget),
      colour: budgetCalculations.sectorForVote(appropriation.vote).colour,
      href: '#/appropriation/' + appropriation.id
    })), { isCompact: true, getTooltip: formatThousandsTooltip });
    renderChartTableTools({
      id: 'ov-largest',
      filename: 'largest-appropriations-2026-27.csv',
      rows: largestAppropriations,
      columns: [createLinkColumn('name', 'Appropriation', appropriation => appropriation.name, appropriation => '#/appropriation/' + appropriation.id), { label: 'Vote', value: appropriation => appropriation.vote }, createAmountColumn('budget', '2026/27 ($000)', appropriation => appropriation.budget)]
    });
  }

  function calculateTrendSeries(voteForTrend) {
    const trendRows = budgetCalculations.getFinancialTrendRows(voteForTrend && voteForTrend.name);
    const currentYearIndex = budgetCalculations.financialTrendYears.indexOf(currentYear);
    const previousYearIndex = budgetCalculations.financialTrendYears.indexOf(previousYear);
    const currentTransfers = voteForTrend ? voteForTrend.transfers : budgetCalculations.totalAmounts.transfers;
    const previousTransfers = voteForTrend ? voteForTrend.transfersPrev : budgetCalculations.totalAmounts.transfersPrev;
    const appropriationValues = trendRows.map((trendRow, yearIndex) => trendRow.spending - (yearIndex === currentYearIndex ? currentTransfers : yearIndex === previousYearIndex ? previousTransfers : 0));
    const transferValues = trendRows.map((trendRow, yearIndex) => (budgetModel.dashboardDisplayOptions.includeTransfers && yearIndex === currentYearIndex ? currentTransfers : 0));
    return { trendRows, currentYearIndex, appropriationValues, transferValues };
  }

  function renderOverviewTrendChart() {
    const { trendRows, currentYearIndex, appropriationValues, transferValues } = calculateTrendSeries(null);
    const trendSeries = [
      { name: 'Total appropriations spending', colour: '#136166', values: appropriationValues, extraValues: transferValues, extraLabel: 'identified transfers' },
      { name: 'Revenue from all Votes', colour: '#f5bc11', values: trendRows.map(trendRow => trendRow.revenue || null) }
    ];
    renderLegend(selectOne('#trend-legend'), [...trendSeries.map(series => ({ label: series.name, colour: series.colour })), ...(budgetModel.dashboardDisplayOptions.includeTransfers ? [{ label: 'Identified transfers', colour: '#757575', keyClassName: 'is-hatched-grey' }] : [])]);
    renderColumnChart(selectOne('#ov-trend'), budgetCalculations.financialTrendYears, trendSeries, {
      formatValue: value => formatThousands(value),
      forecastFromIndex: currentYearIndex + 1,
      yearNotes: trendRows.map(trendRow => trendRow.label),
      ariaLabel: 'Appropriations and Vote revenue each year from 2021/22 to 2029/30. Use "Show as table" for the figures.'
    });
    renderChartTableTools({
      id: 'ov-trend',
      filename: 'appropriations-and-revenue-trend.csv',
      rows: trendRows.map((trendRow, yearIndex) => ({ ...trendRow, appropriations: appropriationValues[yearIndex], transfers: transferValues[yearIndex] })),
      columns: [
        { label: 'Year', value: trendRow => trendRow.year },
        { label: 'Figure', value: trendRow => trendRow.label },
        createAmountColumn('appropriations', 'Appropriations ($000)', trendRow => trendRow.appropriations),
        budgetModel.dashboardDisplayOptions.includeTransfers ? createOptionalAmountColumn('Identified transfers ($000)', trendRow => trendRow.transfers) : null,
        createOptionalAmountColumn('Vote revenue ($000)', trendRow => trendRow.revenue)
      ].filter(Boolean)
    });
  }

  function renderOverviewChangeBars() {
    const calculateChangePercent = change => (change.difference / change.previousAmount) * 100;
    const changes = budgetCalculations.votes
      .map(vote => ({ vote, currentAmount: budgetCalculations.calculateVoteTotal(vote), previousAmount: budgetCalculations.calculateVotePreviousTotal(vote) }))
      .map(change => ({ ...change, difference: change.currentAmount - change.previousAmount }))
      .filter(change => change.previousAmount > 0);
    const largestIncreases = changes.filter(change => change.difference > 0).sort((first, second) => second.difference - first.difference).slice(0, 10);
    const largestDecreases = changes.filter(change => change.difference < 0).sort((first, second) => first.difference - second.difference).slice(0, 10).reverse();
    renderChangeBars(selectOne('#ov-change'), largestIncreases.concat(largestDecreases).map(change => ({
      label: change.vote.name,
      value: change.difference,
      valueText: (change.difference > 0 ? '+' : '') + formatThousands(change.difference),
      subLabel: formatPercentage(calculateChangePercent(change)),
      href: '#/vote/' + change.vote.id,
      colour: change.vote.sector.colour
    })), { getTooltip: formatThousandsChangeTooltip });
    renderChartTableTools({
      id: 'ov-change',
      filename: 'change-by-vote-2025-26-to-2026-27.csv',
      rows: changes.slice().sort((first, second) => second.difference - first.difference),
      columns: [
        createLinkColumn('vote', 'Vote', change => change.vote.name, change => '#/vote/' + change.vote.id),
        createAmountColumn('previousAmount', '2025/26 final budgeted ($000)', change => change.previousAmount),
        createAmountColumn('currentAmount', '2026/27 Budget ($000)', change => change.currentAmount),
        createAmountColumn('difference', 'Change ($000)', change => change.difference),
        { label: 'Change (%)', isNumeric: true, value: change => formatPercentage(calculateChangePercent(change)), csv: change => calculateChangePercent(change).toFixed(2) }
      ]
    });
  }

  function renderOverviewNotes() {
    const notes = budgetReference.notes;
    const perPersonNote = notes.perPerson.replace('{populationDate}', budgetReference.populationDate).replace('{population}', formatNumber(budgetReference.population));
    replaceElementChildren(selectOne('#ov-notes'),
      createElement('li', { id: 'note-total', text: notes.total }),
      createElement('li', { id: 'note-transfers', text: notes.transfers }),
      createElement('li', { id: 'note-perperson' }, perPersonNote + ' ', createSourceLink(budgetReference.sources.population)),
      createElement('li', { id: 'note-revenue', text: notes.revenue }),
      createElement('li', { id: 'note-source' }, 'All figures: ', createSourceLink(budgetReference.sources.estimates), '.'));
  }

  function renderOverview() {
    renderOverviewTreemap();
    renderOverviewTypeBars();
    renderOverviewLargestBars();
    renderOverviewTrendChart();
    renderOverviewChangeBars();
    renderOverviewNotes();
  }

  const votesTableState = createTableState({ sortKey: 'total' });

  function renderVotes(addressParams) {
    const sectorSelect = selectOne('#votes-sector');
    if (!sectorSelect.options.length || addressParams.sector !== undefined) {
      const requestedSector = budgetReference.sectors.find(sector => sector.id === addressParams.sector);
      fillSelectOptions(sectorSelect, 'All sectors', budgetReference.sectors.map(sector => sector.name), requestedSector && requestedSector.name);
    }
    const searchText = selectOne('#votes-search').value.trim();
    const rows = budgetCalculations.votes
      .filter(vote => (!sectorSelect.value || vote.sector.name === sectorSelect.value) && rowMatchesSearch(searchText, [vote.name]))
      .map(vote => ({ vote, total: budgetCalculations.calculateVoteTotal(vote), previous: budgetCalculations.calculateVotePreviousTotal(vote) }));
    const allVotesTotal = budgetCalculations.totalAmounts.spending;
    const shownTotal = sumAmounts(rows, row => row.total);
    const getChangePercent = row => calculatePercentChange(row.total, row.previous);
    selectOne('#votes-note').textContent = 'Amounts in $000.';
    selectOne('#votes-summary').textContent = `${rows.length} Votes, ${formatBillions(shownTotal, true)}` + (rows.length < budgetCalculations.votes.length ? ` (${budgetModel.share(shownTotal, allVotesTotal)} of the total)` : '');
    const columns = [
      createLinkColumn('name', 'Vote', row => row.vote.name, row => '#/vote/' + row.vote.id),
      { key: 'sector', label: 'Sector', value: row => createSectorTag(row.vote.sector), csv: row => row.vote.sector.name },
      createAmountColumn('total', '2026/27 ($000)', row => row.total),
      createAmountColumn('previous', '2025/26 final ($000)', row => row.previous),
      { key: 'change', label: 'Change', isNumeric: true, value: row => formatOptionalPercentChange(getChangePercent(row)), sortValue: getChangePercent, csv: row => toTwoDecimalPlaces(getChangePercent(row)) },
      createShareColumn(row => row.total, allVotesTotal),
      { key: 'count', label: 'Appropriations', isNumeric: true, value: row => String(row.vote.count), csv: row => row.vote.count }
    ];
    const sortedRows = renderTable(selectOne('#votes-table'), columns, rows, votesTableState, () => renderVotes({}));
    selectOne('#votes-csv').onclick = () => downloadTableCsv('votes-2026-27.csv', columns, sortedRows);
  }


/*★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  APPROPRIATIONS
★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★*/
  const FILTER_NAMES = ['sector', 'vote', 'type', 'portfolio', 'department', 'level'];
  const DROPDOWN_FILTERS = [['sector', 'All sectors'], ['vote', 'All Votes'], ['type', 'All types'], ['portfolio', 'All portfolios'], ['department', 'All departments']];
  const appropriationsState = { ...createTableState({ sortKey: 'budget', pageSize: 25 }), searchText: '', sector: '', vote: '', type: '', portfolio: '', department: '', level: 'top' };
  const isDefaultFilter = (filterName, filterValue) => !filterValue || (filterName === 'level' && filterValue === 'top');
  const APPROPRIATION_DOWNLOAD_COLUMNS = [
    ['Vote', 'vote'], ['Appropriation', 'name'], ['Kind', 'kind'], ['Multi-category appropriation', 'parent'], ['Type', 'type'], ['Portfolio', 'portfolio'], ['Minister code', 'ministerCode'], ['Department', 'department'],
    ['Identified transfer', appropriation => (appropriation.transfer ? 'Yes' : '')], ['2026/27 Budget ($000)', 'budget'], ['2025/26 Final Budgeted ($000)', 'prevFinal'], ['2025/26 Estimated Actual ($000)', 'prevEstActual'], ['Scope', 'scope']
  ].map(([label, field]) => ({ label, csv: typeof field === 'function' ? field : appropriation => appropriation[field] }));



  function readAppropriationAddressParams(addressParams) {
    FILTER_NAMES.forEach(filterName => (appropriationsState[filterName] = addressParams[filterName] || (filterName === 'level' ? 'top' : '')));
    Object.assign(appropriationsState, {
      searchText: addressParams.q || '',
      sortKey: addressParams.sort || 'budget',
      sortDirection: addressParams.dir === 'asc' ? 1 : -1,
      pageNumber: Number(addressParams.page) || 1,
      pageSize: [25, 50, 100].includes(Number(addressParams.size)) ? Number(addressParams.size) : 25
    });
  }

  function writeAppropriationAddressParams() {
    const state = appropriationsState;
    const addressParams = new URLSearchParams();
    if (state.searchText) addressParams.set('q', state.searchText);
    FILTER_NAMES.forEach(filterName => { if (!isDefaultFilter(filterName, state[filterName])) addressParams.set(filterName, state[filterName]); });
    if (state.sortKey !== 'budget') addressParams.set('sort', state.sortKey);
    if (state.sortDirection === 1) addressParams.set('dir', 'asc');
    if (state.pageNumber > 1) addressParams.set('page', state.pageNumber);
    if (state.pageSize !== 25) addressParams.set('size', state.pageSize);
    replaceAddressBar('#/appropriations' + (addressParams.toString() ? '?' + addressParams : ''));
  }

  function appropriationMatchesFilters(appropriation, skippedFilterName) {
    const state = appropriationsState;
    if (!budgetCalculations.isAppropriationIncluded(appropriation)) return false;
    if (state.level === 'top' && appropriation.kind === 'category') return false;
    if (state.level === 'category' && appropriation.kind !== 'category') return false;
    const matchesDropdowns = DROPDOWN_FILTERS.every(([filterName]) => filterName === skippedFilterName || !state[filterName] || appropriation[filterName] === state[filterName]);
    if (!matchesDropdowns) return false;
    const minister = findMinister(appropriation.ministerCode);
    return !state.searchText || rowMatchesSearch(state.searchText, [appropriation.name, appropriation.vote, appropriation.portfolio, appropriation.department, appropriation.scope, appropriation.parent, minister && minister.name]);
  }


  // Appropriations table view
  function renderAppropriations(addressParams) {
    if (addressParams) readAppropriationAddressParams(addressParams);
    const state = appropriationsState;
    selectOne('#ap-search').value = state.searchText;
    DROPDOWN_FILTERS.forEach(([filterName, allLabel]) => {
      const availableValues = uniqueSortedValues(budgetCalculations.appropriations.filter(appropriation => appropriationMatchesFilters(appropriation, filterName)), filterName);
      fillSelectOptions(selectOne('#ap-' + filterName), allLabel, availableValues, state[filterName]);
    });
    selectOne('#ap-level').value = state.level;

    const rows = budgetCalculations.appropriations.filter(appropriation => appropriationMatchesFilters(appropriation));
    const budgetTotal = sumAmounts(rows.filter(appropriation => appropriation.kind !== 'category' || state.level === 'category'), appropriation => appropriation.budget || 0);
    const isFiltered = state.searchText || FILTER_NAMES.some(filterName => !isDefaultFilter(filterName, state[filterName]));
    selectOne('#ap-summary').textContent = `${formatNumber(rows.length)} ${rows.length === 1 ? 'result' : 'results'}, totalling ${formatMoney(budgetTotal)} in 2026/27` +
      (state.level === 'all' ? ' (MCA categories are not added to the total)' : '') + '. Multi-year appropriations are listed separately' + (isFiltered ? '.' : ', so this is less than the Vote totals.');

    // final budgeted change percent has been changed on Request to be the change percent with the estimated actual.
    // const has been left incase of a decision to change back.
    const getFinalBudgetedChangePercent = appropriation => calculatePercentChange(appropriation.budget || 0, appropriation.prevFinal);
    const getEstimatedActualChangePercent = appropriation => calculatePercentChange(appropriation.budget || 0, appropriation.prevEstActual);


    const columns = [
      { key: 'name', label: 'Appropriation', value: appropriation => createAppropriationNameCell(appropriation, { showParent: true }), csv: appropriation => appropriation.name },
      { key: 'vote', label: 'Vote', value: appropriation => createVoteLink(appropriation.vote), csv: appropriation => appropriation.vote },
      { key: 'type', label: 'Type', value: appropriation => appropriation.type, csv: appropriation => appropriation.type, className: 'hide-narrow' },
      { key: 'portfolio', label: 'Portfolio', value: appropriation => appropriation.portfolio || '-', csv: appropriation => appropriation.portfolio, className: 'hide-narrow' },
      createAmountColumn('budget', '2026/27 ($000)', appropriation => appropriation.budget),
      createAmountColumn('prevFinal', '2025/26 Estimated Actual', appropriation => appropriation.prevEstActual),
      { key: 'change', label: 'Change', isNumeric: true, 
        value: appropriation => formatOptionalPercentChange(getEstimatedActualChangePercent(appropriation)), 
        sortValue: getEstimatedActualChangePercent, 
        csv: appropriation => toTwoDecimalPlaces(getEstimatedActualChangePercent(appropriation)) }
    ];
    const redrawWithAddress = () => { writeAppropriationAddressParams(); renderAppropriations(); };
    const sortedRows = renderTable(selectOne('#ap-table'), columns, rows, state, redrawWithAddress, { rowClassName: getAppropriationRowClass });
    renderPager(selectOne('#ap-pager'), rows.length, state, () => { redrawWithAddress(); selectOne('#ap-summary').scrollIntoView({ block: 'start' }); });
    selectOne('#ap-csv').onclick = () => downloadCsv('appropriations-2026-27-filtered.csv', APPROPRIATION_DOWNLOAD_COLUMNS, sortedRows);
  }

  function bindAppropriationControls() {
    let searchTimerId;
    const applyFilterChange = () => { appropriationsState.pageNumber = 1; writeAppropriationAddressParams(); renderAppropriations(); };
    selectOne('#ap-search').addEventListener('input', event => {
      clearTimeout(searchTimerId);
      searchTimerId = setTimeout(() => { appropriationsState.searchText = event.target.value.trim(); applyFilterChange(); }, 250);
    });
    selectAll('#page-appropriations select[data-filter]').forEach(filterSelect => filterSelect.addEventListener('change', () => { appropriationsState[filterSelect.dataset.filter] = filterSelect.value; applyFilterChange(); }));
    selectOne('#ap-reset').addEventListener('click', () => { readAppropriationAddressParams({}); writeAppropriationAddressParams(); renderAppropriations(); });
  }

/*★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
 MULTI-YEAR APPROPRIATIONS
★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★*/
  const multiYearTableState = createTableState({ sortKey: 'budgetYear', pageSize: 25 });
  const getEndYear = multiYear => (multiYear.expires || '').slice(-4);

  function renderMultiYear() {
    const allMultiYears = budgetCalculations.multiYearAppropriations;
    replaceElementChildren(selectOne('#mya-figures'),
      createStatCard('Multi-year appropriations', '', String(allMultiYears.length), 'In ' + uniqueSortedValues(allMultiYears, 'vote').length + ' Votes'),
      createStatCard('Amount', '2026/27', formatMoney(sumAmounts(allMultiYears, multiYear => multiYear.budgetYear || 0)), 'Included in the Vote totals'),
      createStatCard('Total over their lives', '', formatMoney(sumAmounts(allMultiYears, multiYear => multiYear.adjusted || 0)), 'Adjusted appropriations'));
    const voteSelect = selectOne('#mya-vote');
    const typeSelect = selectOne('#mya-type');
    const endYearSelect = selectOne('#mya-ends');
    if (!voteSelect.options.length) {
      fillSelectOptions(voteSelect, 'All Votes', uniqueSortedValues(allMultiYears, 'vote'));
      fillSelectOptions(typeSelect, 'All types', uniqueSortedValues(allMultiYears, 'type'));
      fillSelectOptions(endYearSelect, 'Any year', [...new Set(allMultiYears.map(getEndYear).filter(Boolean))].sort());
    }
    const searchText = selectOne('#mya-search').value.trim();
    const rows = allMultiYears.filter(multiYear => (!voteSelect.value || multiYear.vote === voteSelect.value) && (!typeSelect.value || multiYear.type === typeSelect.value) && (!endYearSelect.value || getEndYear(multiYear) === endYearSelect.value)
      && rowMatchesSearch(searchText, [multiYear.name, multiYear.vote, multiYear.portfolio, multiYear.department]));
    selectOne('#mya-summary').textContent = `${rows.length} multi-year appropriations, ${formatMoney(sumAmounts(rows, multiYear => multiYear.budgetYear || 0))} in 2026/27`;
    const createDateColumn = (key, label, getDate) => ({ key, label, value: multiYear => getDate(multiYear) || '-', sortValue: multiYear => Date.parse(getDate(multiYear)) || 0, csv: getDate });
    const columns = [
      createLinkColumn('name', 'Appropriation', multiYear => multiYear.name, multiYear => '#/mya/' + multiYear.id),
      { key: 'vote', label: 'Vote', value: multiYear => createVoteLink(multiYear.vote), csv: multiYear => multiYear.vote },
      { key: 'type', label: 'Type', value: multiYear => multiYear.type, csv: multiYear => multiYear.type },
      createDateColumn('commences', 'Starts', multiYear => multiYear.commences),
      createDateColumn('expires', 'Ends', multiYear => multiYear.expires),
      createAmountColumn('budgetYear', '2026/27 ($000)', multiYear => multiYear.budgetYear),
      createAmountColumn('adjusted', 'Whole life ($000)', multiYear => multiYear.adjusted)
    ];
    const sortedRows = renderTable(selectOne('#mya-table'), columns, rows, multiYearTableState, renderMultiYear);
    renderPager(selectOne('#mya-pager'), rows.length, multiYearTableState, renderMultiYear);
    selectOne('#mya-csv').onclick = () => downloadTableCsv('multi-year-appropriations-filtered.csv', columns, sortedRows);
  }


/*★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  FINANCIAL SUMMARY
★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★*/
  const SUMMARY_COLUMNS = [['2021/22', 'Actual'], ['2022/23', 'Actual'], ['2023/24', 'Actual'], ['2024/25', 'Actual'], [previousYear, 'Final Budgeted'], [previousYear, 'Estimated Actual'], [currentYear, 'Total Budget'], ['2027/28', 'Estimated'], ['2028/29', 'Estimated'], ['2029/30', 'Estimated']];
  const AMOUNT_TYPE_LABELS = { Actual: 'Actual', 'Final Budgeted': 'Final budgeted', 'Estimated Actual': 'Estimated actual', 'Total Budget': 'Budget', Estimated: 'Forecast' };
  const expandedVoteIds = new Set();

  function getSummaryColumnClassName(columnIndex) {
    const amountType = SUMMARY_COLUMNS[columnIndex][1];
    const startsYear = columnIndex === 0 || SUMMARY_COLUMNS[columnIndex][0] !== SUMMARY_COLUMNS[columnIndex - 1][0];
    return (amountType === 'Estimated' ? ' is-forecast' : amountType === 'Total Budget' ? ' is-budget' : '') + (startsYear ? ' year-start' : '');
  }

  function sumCategoryValues(voteName, side, category, totalGroup, columnIndex) {
    const [year, amountType] = SUMMARY_COLUMNS[columnIndex];
    return sumAmounts(budgetCalculations.budgetData.sfa.filter(record => record.vote === voteName && record.side === side && record.category === category && record.year === year && record.amountType === amountType && record.group !== totalGroup), record => record.value);
  }

  function buildSummaryModel() {
    const side = (selectOne('input[name="sfa-side"]:checked') || {}).value || 'Appropriations';
    const sectorName = selectOne('#sfa-sector').value;
    const voteName = selectOne('#sfa-vote').value;
    const totalGroup = side === 'Revenue' ? 'Total Crown Revenue and Capital Receipts' : 'Total Appropriations';
    const sumColumns = (voteToSum, filter) => SUMMARY_COLUMNS.map(([year, amountType]) => budgetCalculations.sumFinancialActivity({ vote: voteToSum, side, year, amountType, ...filter }));
    const voteRows = [];
    budgetCalculations.votes.filter(vote => (!sectorName || vote.sector.name === sectorName) && (!voteName || vote.name === voteName)).slice().sort((first, second) => first.name.localeCompare(second.name)).forEach(vote => {
      const totalValues = sumColumns(vote.name, { group: totalGroup });
      if (!totalValues.some(Boolean)) return;
      const categories = [...new Set(budgetCalculations.budgetData.sfa.filter(record => record.vote === vote.name && record.side === side && record.group !== totalGroup).map(record => record.category))].sort();
      voteRows.push({ vote, label: 'Vote ' + vote.name, values: totalValues, children: categories.map(category => ({ label: category, values: SUMMARY_COLUMNS.map((unused, columnIndex) => sumCategoryValues(vote.name, side, category, totalGroup, columnIndex)) })) });
    });
    const grandTotals = sectorName || voteName ? SUMMARY_COLUMNS.map((unused, columnIndex) => sumAmounts(voteRows, voteRow => voteRow.values[columnIndex])) : sumColumns('Summary of Trends', { group: totalGroup });
    return { side, sectorName, voteName, voteRows, grandTotals };
  }

  function renderSummary() {
    const sectorSelect = selectOne('#sfa-sector');
    const voteSelect = selectOne('#sfa-vote');
    if (!sectorSelect.options.length) fillSelectOptions(sectorSelect, 'All sectors', budgetReference.sectors.map(sector => sector.name));
    fillSelectOptions(voteSelect, 'All Votes', budgetCalculations.votes.filter(vote => !sectorSelect.value || vote.sector.name === sectorSelect.value).map(vote => vote.name).sort((first, second) => first.localeCompare(second)), voteSelect.value);
    const unit = (selectOne('input[name="sfa-unit"]:checked') || {}).value || 'k';
    const formatAmount = amount => (!amount ? '-' : unit === 'm' ? formatNumber(amount / 1000, 1) : formatThousands(amount));
    const model = buildSummaryModel();
    const totalLabel = model.voteName ? 'Total, Vote ' + model.voteName : model.sectorName ? 'Total, ' + model.sectorName : 'Total, all Votes';
    const createAmountCells = values => values.map((value, columnIndex) => createElement('td', { class: 'num' + getSummaryColumnClassName(columnIndex), text: formatAmount(value) }));
    const years = [...new Set(SUMMARY_COLUMNS.map(([year]) => year))];
    const table = selectOne('#sfa-table');
    const captionElement = table.querySelector('caption');
    replaceElementChildren(table, captionElement,
      createElement('thead', {},
        createElement('tr', {}, createElement('th', { scope: 'col', rowspan: '2', class: 'pivot-first', text: model.side === 'Revenue' ? 'Vote and revenue type' : 'Vote and appropriation type' }),
          years.map(year => createElement('th', { scope: 'colgroup', colspan: SUMMARY_COLUMNS.filter(([columnYear]) => columnYear === year).length, class: 'num year-head', text: year }))),
        createElement('tr', {}, SUMMARY_COLUMNS.map(([, amountType]) => createElement('th', { scope: 'col', class: 'num sub-head' + (amountType === 'Estimated' ? ' is-forecast' : amountType === 'Total Budget' ? ' is-budget' : ''), text: AMOUNT_TYPE_LABELS[amountType] })))),
      createElement('tbody', {}, model.voteRows.map(voteRow => {
        const isExpanded = expandedVoteIds.has(voteRow.vote.id);
        const categoryRowId = 'sfa-' + voteRow.vote.id;
        const toggleExpansion = () => { if (isExpanded) expandedVoteIds.delete(voteRow.vote.id); else expandedVoteIds.add(voteRow.vote.id); renderSummary(); };
        const toggleButton = createElement('button', { type: 'button', class: 'pivot-toggle', 'aria-expanded': String(isExpanded), 'aria-controls': voteRow.children.map((unused, childIndex) => categoryRowId + '-' + childIndex).join(' '), onclick: toggleExpansion },
          createElement('span', { class: 'chev', 'aria-hidden': 'true' }), createElement('span', { class: 'sr-only', text: isExpanded ? 'Close ' : 'Open ' }));
        return [
          createElement('tr', { class: 'pivot-vote' }, createElement('th', { scope: 'row', class: 'pivot-first' }, toggleButton, createLink('#/vote/' + voteRow.vote.id, voteRow.label)), createAmountCells(voteRow.values)),
          voteRow.children.map((category, childIndex) => createElement('tr', { class: 'pivot-cat', id: categoryRowId + '-' + childIndex, hidden: !isExpanded }, createElement('th', { scope: 'row', class: 'pivot-first', text: category.label }), createAmountCells(category.values)))
        ];
      })),
      createElement('tfoot', {}, createElement('tr', {}, createElement('th', { scope: 'row', class: 'pivot-first', text: totalLabel }), createAmountCells(model.grandTotals))));
    selectOne('#sfa-msg').textContent = 'Amounts in ' + (unit === 'm' ? '$ million' : '$000') + '. ' + model.voteRows.length + ' Votes.';

    const buildExportLines = () => {
      const formatExportValue = value => (unit === 'm' ? (value / 1000).toFixed(1) : value);
      const headings = ['Vote', 'Category'].concat(SUMMARY_COLUMNS.map(([year, amountType]) => year + ' ' + AMOUNT_TYPE_LABELS[amountType] + (unit === 'm' ? ' ($m)' : ' ($000)')));
      const bodyLines = model.voteRows.flatMap(voteRow => [[voteRow.vote.name, 'Total'].concat(voteRow.values.map(formatExportValue)), ...voteRow.children.map(category => [voteRow.vote.name, category.label].concat(category.values.map(formatExportValue)))]);
      return [headings, ...bodyLines, [totalLabel, ''].concat(model.grandTotals.map(formatExportValue))];
    };
    selectOne('#sfa-csv').onclick = () => {
      const [headings, ...bodyLines] = buildExportLines();
      downloadCsv('summary-of-financial-activity-' + model.side.toLowerCase() + '.csv', headings.map((heading, columnIndex) => ({ label: heading, csv: line => line[columnIndex] })), bodyLines);
    };
    selectOne('#sfa-copy').onclick = async () => {
      const wasCopied = await budgetModel.copyText(buildExportLines().map(line => line.join('\t')).join('\n'));
      selectOne('#sfa-msg').textContent = wasCopied ? 'Copied. Paste into Excel.' : 'Copying is blocked in this browser. Use Download (CSV) instead.';
    };
    selectOne('#sfa-open-all').onclick = () => { model.voteRows.forEach(voteRow => expandedVoteIds.add(voteRow.vote.id)); renderSummary(); };
    selectOne('#sfa-close-all').onclick = () => { expandedVoteIds.clear(); renderSummary(); };
  }

/*★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  MINISTERS AND DEPARTMENTS
★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★*/
  const peopleTableState = createTableState({ sortKey: 'total' });

  function renderPeople(tabName) {
    const activeTab = tabName === 'departments' ? 'departments' : 'ministers';
    const isMinisterTab = activeTab === 'ministers';
    selectAll('#page-people [data-tab]').forEach(tabLink => tabLink.setAttribute('aria-current', tabLink.dataset.tab === activeTab ? 'page' : 'false'));
    const searchInput = selectOne('#people-search');
    searchInput.placeholder = isMinisterTab ? 'Portfolio, Minister or code' : 'Department or code';
    const responsibilityByCode = budgetCalculations.getResponsibilitiesByCode(isMinisterTab ? 'ministerCode' : 'departmentCode');
    const findReference = isMinisterTab ? findMinister : findDepartment;
    const allRows = Object.values(responsibilityByCode).map(row => ({ ...row, reference: findReference(row.code) || {} }));
    const getFirstPortfolio = row => [...row.portfolios][0] || row.code;
    const getPortfolioName = row => row.reference.portfolio || getFirstPortfolio(row);
    const getDepartmentName = row => row.reference.name || getFirstPortfolio(row);
    const codeColumn = { key: 'code', label: 'Code', value: row => row.code, sortValue: row => Number(row.code.slice(1)), csv: row => row.code };
    const countColumns = [
      { key: 'votes', label: 'Votes', isNumeric: true, value: row => String(row.votes.size), sortValue: row => row.votes.size, csv: row => row.votes.size },
      { key: 'count', label: 'Appropriations', isNumeric: true, value: row => String(row.count), csv: row => row.count },
      createAmountColumn('total', '2026/27 ($000)', row => row.total)
    ];
    const columns = isMinisterTab
      ? [{ ...createLinkColumn('portfolio', 'Portfolio', getPortfolioName, row => '#/minister/' + row.code), sortValue: row => row.reference.portfolio || '' }, { key: 'name', label: 'Minister', value: row => row.reference.name || 'Not listed', csv: row => row.reference.name }, codeColumn, ...countColumns]
      : [{ ...createLinkColumn('name', 'Department', getDepartmentName, row => '#/department/' + row.code), sortValue: row => row.reference.name || '' }, codeColumn, ...countColumns];
    selectOne('#people-note').textContent = isMinisterTab
      ? 'Minister names as at ' + budgetReference.ministersAsAt + '. Portfolios change, so check the current list of Ministers before quoting. Totals include multi-year appropriations' + (budgetModel.dashboardDisplayOptions.includeTransfers ? ' and identified transfers.' : ', not identified transfers.')
      : 'Departments are the agencies that administer each appropriation, shown by the code in the Estimates.';
    const rows = allRows.filter(row => rowMatchesSearch(searchInput.value.trim(), [row.code, row.reference.portfolio, row.reference.name, ...row.portfolios]));
    selectOne('#people-caption').textContent = isMinisterTab ? 'Ministers by portfolio' : 'Departments';
    selectOne('#people-summary').textContent = rows.length + (isMinisterTab ? ' portfolios' : ' departments');
    if (!columns.some(column => column.key === peopleTableState.sortKey)) peopleTableState.sortKey = 'total';
    const sortedRows = renderTable(selectOne('#people-table'), columns, rows, peopleTableState, () => renderPeople(activeTab));
    selectOne('#people-csv').onclick = () => downloadTableCsv(activeTab + '-2026-27.csv', columns, sortedRows);
  }

  const createDetailHeading = (kicker, title, lede) => createElement('div', { class: 'page-head' }, kicker ? createElement('p', { class: 'kicker' }, kicker) : null, createElement('h1', { tabindex: '-1', text: title }), lede ? createElement('p', { class: 'lede' }, lede) : null);
  const createMinisterNote = () => createElement('p', { class: 'small', text: 'Minister as at ' + budgetReference.ministersAsAt + '.' });

  function createCopyLinkButtons(linkToCopy = location.href, shouldShowPrint = true) {
    const messageElement = createElement('span', { class: 'copy-msg', role: 'status' });
    const copyLink = async () => { messageElement.textContent = (await budgetModel.copyText(linkToCopy)) ? 'Link copied.' : 'Copy the address from your browser.'; };
    return createElement('div', { class: 'button-row page-tools' }, createElement('button', { type: 'button', class: 'btn-small', text: 'Copy link', onclick: copyLink }), shouldShowPrint ? createElement('button', { type: 'button', class: 'btn-small', text: 'Print', onclick: () => window.print() }) : null, messageElement);
  }

  function createFiguresTable(captionText, figureRows) {
    const createGlossaryButton = (label, glossaryTerm) => createElement('button', { type: 'button', class: 'info', 'data-term': glossaryTerm, 'aria-label': 'What is ' + label + '?', text: '?' });
    return createElement('table', { class: 'data-table', 'aria-label': captionText },
      createElement('thead', {}, createElement('tr', {}, createElement('th', { scope: 'col', text: captionText }), createElement('th', { scope: 'col', class: 'num', text: '$000' }))),
      createElement('tbody', {}, figureRows.map(([label, amount, glossaryTerm]) => createElement('tr', {}, createElement('th', { scope: 'row' }, label, glossaryTerm ? createGlossaryButton(label, glossaryTerm) : null), createElement('td', { class: 'num', text: formatThousands(amount) })))));
  }

function createResponsibilitySection(record, shouldShowCodes) {
  const minister = findMinister(record.ministerCode);
  const department = findDepartment(record.departmentCode);
  const portfolioText = minister ? minister.portfolio : record.portfolio;
  const createMetaItem = (label, ...valueChildren) => createElement('div', {}, createElement('dt', { text: label }), createElement('dd', {}, valueChildren));
  const codeTags = [record.ministerCode, record.departmentCode].filter(Boolean).map(code => createElement('span', { class: 'code-tag', text: code }));

  return createElement('section', { class: 'item-responsible' },
    createElement('h3', { class: 'item-label', text: 'Minister Responsible' }),
    createElement('p', { class: 'item-portfolio' }, record.ministerCode ? createLink('#/minister/' + record.ministerCode, portfolioText) : portfolioText || '-'),
    minister ? createElement('p', { class: 'item-minister', text: minister.name }) : null,
    shouldShowCodes && minister ? createMinisterNote() : null,
    createElement('dl', { class: 'item-meta' },
      createMetaItem('Vote', createVoteLink(record.vote)),
      createMetaItem('Department', record.departmentCode ? createLink('#/department/' + record.departmentCode, department ? department.name : record.department) : record.department || '-'),
      createMetaItem('Type', record.type || '-'),
      shouldShowCodes ? createMetaItem('Codes', codeTags) : null));
}

  function createScopeSection(record, shouldExplainScope) {
    return createSection('Scope', createElement('blockquote', { class: 'scope' }, createElement('p', { text: record.scope || 'No scope statement in the extracted data.' })),
      shouldExplainScope ? createElement('p', { class: 'small' }, 'The ', createGlossaryTermButton('scope', 'term', 'scope'), ' is the legal limit on what this money can be used for.') : null);
  }

  function createTransferNotice(vote) {
    const includesTransfers = budgetModel.dashboardDisplayOptions.includeTransfers;
    const includeCheckbox = createElement('label', { class: 'check' }, createElement('input', { type: 'checkbox', 'data-setting': 'transfers' }), 'Include identified transfers');
    return createElement('aside', { class: 'notice' }, createElement('p', {}, 'This Vote includes ' + formatMoney(vote.transfers) + ' of identified transfers. ' + (includesTransfers ? 'They are included in the figures on this page.' : 'They are left out of the figures on this page. '), includesTransfers ? null : includeCheckbox));
  }

  function renderVotePage(voteId) {
    const vote = budgetCalculations.voteById.get(voteId);
    if (!vote) return false;
    const currentTotal = budgetCalculations.calculateVoteTotal(vote);
    const previousTotal = budgetCalculations.calculateVotePreviousTotal(vote);
    const departmentNames = vote.departmentCodes.map(code => (findDepartment(code) || {}).name || code);
    const voteAppropriations = budgetCalculations.appropriations.filter(appropriation => appropriation.vote === vote.name);
    const topLevelAppropriations = voteAppropriations.filter(appropriation => appropriation.kind !== 'category').sort(compareByBudgetDescending);
    const voteMultiYears = budgetCalculations.multiYearAppropriations.filter(multiYear => multiYear.vote === vote.name);
    const splitMultiYearCount = voteMultiYears.filter(multiYear => !multiYear.unsplit).length;
    document.title = 'Vote ' + vote.name + ' - Budget 2026/27 dashboard';

    const pageContent = [
      createDetailHeading(createSectorTag(vote.sector), 'Vote ' + vote.name, 'Administered by ' + (departmentNames.join(', ') || 'not listed') + '.'),
      createCopyLinkButtons(),
      createStatCards(
        createStatCard('Appropriations', '2026/27', formatMoney(currentTotal), budgetModel.share(currentTotal, budgetCalculations.totalAmounts.spending) + ' of all Votes'),
        createStatCard('Change from 2025/26', '', previousTotal ? budgetModel.signedMoney(currentTotal - previousTotal) : '-', previousTotal ? formatPercentage(calculatePercentChange(currentTotal, previousTotal)) + ' on final budgeted' : ''),
        createStatCard('Appropriations in this Vote', '', String(vote.count), splitMultiYearCount ? 'Including ' + splitMultiYearCount + ' multi-year' : ''),
        vote.revenue ? createStatCard('Vote revenue', '2026/27', formatMoney(vote.revenue), '') : null)
    ];
    if (vote.transfers) pageContent.push(createTransferNotice(vote));
    const voteNote = budgetReference.voteNotes && budgetReference.voteNotes[vote.name];
    if (voteNote) pageContent.push(createElement('aside', { class: 'notice' }, createElement('p', { text: voteNote })));
    if (vote.check && budgetReference.site.showDataChecks) {
      pageContent.push(createElement('aside', { class: 'notice notice-warning' }, createElement('p', {}, createElement('b', { text: 'Data check: ' }),
        'the Vote total (' + formatMoney(vote.check.voteTotal) + ') is ' + formatMoney(vote.check.difference) + ' more than the appropriations listed here. One or more appropriations may be missing from the extracted data. ', createLink(budgetReference.sources.estimates.url, 'Check the Vote document'), '.')));
    }
    const ministerItems = vote.ministerCodes.map(code => { const minister = findMinister(code); return createElement('li', {}, createLink('#/minister/' + code, minister ? minister.portfolio : code), minister ? createElement('span', { text: minister.name }) : null); });
    pageContent.push(
      createSection('Over time', createChartFigure('vd-trend', 'Appropriations for Vote ' + vote.name + ', 2021/22 to 2029/30, $000. Years after 2026/27 are forecasts.')),
      createElement('div', { class: 'grid-2' }, createSection('By type of spending', createChartFigure('vd-types', '2026/27 appropriations by type, $000.')), createSection('Ministers responsible', createElement('ul', { class: 'people-list' }, ministerItems), createMinisterNote())),
      createSection('Appropriations in this Vote',
        createElement('p', { class: 'small', text: 'Multi-category appropriations are followed by their categories, which are already counted in the MCA total.' }),
        createScrollableTable('vd-table', 'Appropriations in Vote ' + vote.name),
        createElement('div', { class: 'table-actions' }, createElement('button', { type: 'button', class: 'btn-small', id: 'vd-csv', text: 'Download (CSV)' }), createElement('a', { class: 'btn-small', href: '#/appropriations?vote=' + encodeURIComponent(vote.name), text: 'Open in the appropriations search' }))),
      voteMultiYears.length ? createSection('Multi-year appropriations', createScrollableTable('vd-mya', 'Multi-year appropriations in Vote ' + vote.name)) : null,
      createSourceFooter()
    );
    replaceElementChildren(selectOne('#detail'), ...pageContent);

    const { trendRows, currentYearIndex, appropriationValues, transferValues } = calculateTrendSeries(vote);
    renderColumnChart(selectOne('#vd-trend'), budgetCalculations.financialTrendYears, [{ name: 'Appropriations', colour: vote.sector.colour, values: appropriationValues, extraValues: transferValues, extraLabel: 'identified transfers' }], {
      formatValue: value => formatThousands(value),
      forecastFromIndex: currentYearIndex + 1,
      yearNotes: trendRows.map(trendRow => trendRow.label),
      ariaLabel: 'Appropriations for Vote ' + vote.name + ' each year. Use "Show as table" for the figures.'
    });
    renderChartTableTools({
      id: 'vd-trend',
      filename: 'vote-' + vote.id + '-trend.csv',
      rows: trendRows.map((trendRow, yearIndex) => ({ ...trendRow, appropriations: appropriationValues[yearIndex] + transferValues[yearIndex] })),
      columns: [{ label: 'Year', value: trendRow => trendRow.year }, { label: 'Figure', value: trendRow => trendRow.label }, createAmountColumn('appropriations', 'Appropriations ($000)', trendRow => trendRow.appropriations), createOptionalAmountColumn('Vote revenue ($000)', trendRow => trendRow.revenue)]
    });

    const typeRows = budgetCalculations.getAppropriationsByType(vote.name);
    renderBars(selectOne('#vd-types'), typeRows.map(typeRow => ({ label: getTypeDisplayName(typeRow.category), value: typeRow.value, valueText: formatThousands(typeRow.value), glossaryTerm: typeRow.term, colour: vote.sector.colour })), { getTooltip: formatThousandsTooltip });
    renderChartTableTools({ id: 'vd-types', filename: 'vote-' + vote.id + '-by-type.csv', rows: typeRows, columns: [{ label: 'Type', value: typeRow => getTypeDisplayName(typeRow.category) }, createAmountColumn('value', '2026/27 ($000)', typeRow => typeRow.value)] });

    const orderedAppropriations = topLevelAppropriations.flatMap(appropriation => [appropriation, ...(appropriation.kind === 'mca' ? voteAppropriations.filter(category => category.kind === 'category' && category.parent === appropriation.name).sort(compareByBudgetDescending) : [])]);
    const columns = [
      { label: 'Appropriation', value: appropriation => createAppropriationNameCell(appropriation), csv: appropriation => appropriation.name },
      { label: 'Type', value: appropriation => (appropriation.kind === 'category' ? appropriation.category : appropriation.type), csv: appropriation => appropriation.type, className: 'hide-narrow' },
      { label: 'Portfolio', value: appropriation => appropriation.portfolio || '-', csv: appropriation => appropriation.portfolio, className: 'hide-narrow' },
      createAmountColumn('budget', '2026/27 ($000)', appropriation => appropriation.budget),
      createAmountColumn('prevFinal', '2025/26 final ($000)', appropriation => appropriation.prevFinal)
    ];
    renderTable(selectOne('#vd-table'), columns, orderedAppropriations, createTableState(), null, { keepOrder: true, rowClassName: getAppropriationRowClass });
    selectOne('#vd-csv').onclick = () => downloadTableCsv('vote-' + vote.id + '-appropriations.csv', [...columns, { label: 'Kind', csv: appropriation => appropriation.kind }, { label: 'Scope', csv: appropriation => appropriation.scope }], orderedAppropriations);
    if (voteMultiYears.length) {
      const multiYearColumns = [
        createLinkColumn('name', 'Appropriation', multiYear => multiYear.name, multiYear => '#/mya/' + multiYear.id),
        { label: 'Ends', value: multiYear => multiYear.expires || '-' },
        createAmountColumn('budgetYear', '2026/27 ($000)', multiYear => multiYear.budgetYear),
        createAmountColumn('adjusted', 'Whole life ($000)', multiYear => multiYear.adjusted)
      ];
      renderTable(selectOne('#vd-mya'), multiYearColumns, voteMultiYears.slice().sort((first, second) => (second.budgetYear || 0) - (first.budgetYear || 0)), createTableState(), null, { keepOrder: true });
    }
  }

  /*★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  POPUP CALLS??
★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★*/
  function renderAppropriationDetail(appropriationId, targetElement) {
    const appropriation = budgetCalculations.appropriationById.get(appropriationId);
    if (!appropriation) return false;
    const vote = budgetCalculations.voteByName.get(appropriation.vote);
    const parentAppropriation = appropriation.kind === 'category' ? budgetCalculations.appropriations.find(candidate => candidate.kind === 'mca' && candidate.vote === appropriation.vote && candidate.name === appropriation.parent) : null;    
    const categories = appropriation.kind === 'mca' ? budgetCalculations.appropriations.filter(candidate => candidate.kind === 'category' && candidate.vote === appropriation.vote && candidate.parent === appropriation.name).sort(compareByBudgetDescending) : [];    const figureRows = [['2026/27 Budget', appropriation.budget, 'budgetfigure'], ['2025/26 final budgeted', appropriation.prevFinal, 'finalbudgeted'], ['2025/26 estimated actual', appropriation.prevEstActual, 'estactual']].filter(([, amount]) => amount != null);
    const hasBothBudgets = appropriation.prevFinal != null && appropriation.budget != null;
    const content = [
      createDetailHeading(createElement('span', {}, createVoteLink(appropriation.vote), ' | ', appropriation.kind === 'category' ? 'Category of a multi-category appropriation' : appropriation.type), appropriation.name, null),
      createCopyLinkButtons(),
      createResponsibilitySection(appropriation, true),
      createStatCards(
        createStatCard('Budget', '2026/27', appropriation.budget != null ? formatMoney(appropriation.budget) : '-', appropriation.budget != null ? '$' + formatThousands(appropriation.budget) + ',000' : ''),
        createStatCard('Change from 2025/26', '', hasBothBudgets ? budgetModel.signedMoney(appropriation.budget - appropriation.prevFinal) : '-', appropriation.prevFinal ? formatPercentage(calculatePercentChange(appropriation.budget || 0, appropriation.prevFinal)) + ' on final budgeted' : 'No 2025/26 figure'),
        vote ? createStatCard('Share of Vote ' + appropriation.vote, '2026/27', appropriation.kind === 'category' || !budgetCalculations.calculateVoteTotal(vote) ? '-' : budgetModel.share(appropriation.budget || 0, budgetCalculations.calculateVoteTotal(vote)), '') : null),
      appropriation.transfer ? createElement('aside', { class: 'notice' }, createElement('p', {}, 'This is an ', createGlossaryTermButton('transfer', 'term', 'identified transfer'), '. It moves assets within government rather than paying for services, so it is left out of most totals on this site.')) : null,
      createSection('Figures', createFiguresTable('Figures for ' + appropriation.name, figureRows)),
      createScopeSection(appropriation, true),
      parentAppropriation ? createSection('Part of', createElement('p', {}, createLink('#/appropriation/' + parentAppropriation.id, parentAppropriation.name), ' (multi-category appropriation, ' + formatMoney(parentAppropriation.budget || 0) + ' in 2026/27)')) : null,
      categories.length ? createSection('Categories', createElement('table', { class: 'data-table' }, createElement('caption', { class: 'sr-only', text: 'Categories of ' + appropriation.name }),
        createElement('thead', {}, createElement('tr', {}, createElement('th', { scope: 'col', text: 'Category' }), createElement('th', { scope: 'col', text: 'Type' }), createElement('th', { scope: 'col', class: 'num', text: '2026/27 ($000)' }))),
        createElement('tbody', {}, categories.map(category => createElement('tr', {}, createElement('th', { scope: 'row' }, createLink('#/appropriation/' + category.id, category.name)), createElement('td', { text: category.category || '-' }), createElement('td', { class: 'num', text: formatThousands(category.budget) })))))) : null,
      createSourceFooter(appropriation.vote)
    ];
    replaceElementChildren(targetElement, ...content);
  }

  function renderMultiYearDetail(multiYearId, targetElement) {
    const multiYear = budgetCalculations.multiYearAppropriationById.get(multiYearId);
    if (!multiYear) return false;
    const lifecycleParts = [
      { label: 'Spent before 2025/26', value: multiYear.actualToPriorYearEnd, colour: '#136166' },
      { label: 'Expected in 2025/26', value: multiYear.estActualCurrent, colour: '#2ebcc5' },
      { label: 'Budgeted for 2026/27', value: multiYear.budgetYear, colour: '#f5bc11' },
      { label: 'Left after 2026/27', value: multiYear.remaining, colour: '#acacac', isHatched: true }
    ].map(part => ({ ...part, valueText: part.value != null ? formatThousands(part.value) : 'not given' }));
    const usedAmount = sumAmounts(lifecycleParts.slice(0, 3), part => part.value || 0);
    if (multiYear.remaining == null && multiYear.adjusted > usedAmount) {
      lifecycleParts[3].value = multiYear.adjusted - usedAmount;
      lifecycleParts[3].valueText = formatThousands(lifecycleParts[3].value) + ' (worked out by the Library)';
    }
    const lifetimeAmount = Math.max(multiYear.adjusted || 0, sumAmounts(lifecycleParts, part => part.value || 0));
    const figureRows = [['Original appropriation', multiYear.original], ['Adjustments to prior years', multiYear.adjustPrior], ['Adjustments in the current year', multiYear.adjustCurrent], ['Adjusted appropriation', multiYear.adjusted], ['Actual to the end of 2024/25', multiYear.actualToPriorYearEnd], ['Estimated actual 2025/26', multiYear.estActualCurrent], ['Budget 2026/27', multiYear.budgetYear], ['Estimated remaining', multiYear.remaining]];
    replaceElementChildren(targetElement,
      createDetailHeading(createElement('span', {}, createVoteLink(multiYear.vote), ' | Multi-year appropriation'), multiYear.name, null),
      createCopyLinkButtons(),
      createResponsibilitySection(multiYear, false),
        createStatCards(
          createStatCard('Amount', '2026/27', multiYear.budgetYear != null ? formatMoney(multiYear.budgetYear) : '-', ''),
          createStatCard('Whole life', '', multiYear.adjusted != null ? formatMoney(multiYear.adjusted) : '-', 'Adjusted appropriation'),
          createStatCard('Runs', '', (multiYear.commences || '?') + ' to ' + (multiYear.expires || '?'), '')),      
      createSection('How much has been used', createChartFigure('mya-life', 'The whole appropriation, from start to end, $000.')),
      createSection('Figures', createFiguresTable('Figures for ' + multiYear.name, figureRows)),
      createScopeSection(multiYear, false),
      createSourceFooter(multiYear.vote));
    renderLifecycleBar(selectOne('#mya-life'), lifecycleParts, lifetimeAmount);
    renderChartTableTools({ id: 'mya-life', filename: 'mya-' + multiYear.id + '.csv', rows: lifecycleParts, columns: [{ label: 'Part', value: part => part.label }, createAmountColumn('value', '$000', part => part.value)] });
  }

  function renderPersonPage(personKind, code) {
    const isMinister = personKind === 'minister';
    const reference = isMinister ? findMinister(code) : findDepartment(code);
    const responsibilityField = isMinister ? 'ministerCode' : 'departmentCode';
    const appropriations = budgetCalculations.topLevelAppropriations.filter(appropriation => appropriation[responsibilityField] === code).concat(budgetCalculations.multiYearAppropriations.filter(multiYear => multiYear[responsibilityField] === code));
    if (!reference && !appropriations.length) return false;
    const fallbackTitle = appropriations[0] && (isMinister ? appropriations[0].portfolio : appropriations[0].department);
    const title = reference ? (isMinister ? reference.portfolio : reference.name) : fallbackTitle || code;
    const getBudgetAmount = appropriation => (appropriation.budget != null ? appropriation.budget : appropriation.budgetYear);
    const includedTotal = sumAmounts(appropriations.filter(budgetCalculations.isAppropriationIncluded), appropriation => getBudgetAmount(appropriation) || 0);
    document.title = title + ' - Budget 2026/27 dashboard';
    const lede = isMinister ? (reference ? reference.name + '. ' + reference.desc : null) : reference && reference.note ? reference.note : null;
    replaceElementChildren(selectOne('#detail'),
      createDetailHeading(code, title, lede),
      createCopyLinkButtons(),
      createStatCards(
        createStatCard('Appropriations', '2026/27', formatMoney(includedTotal), budgetModel.share(includedTotal, budgetCalculations.totalAmounts.spending) + ' of all Votes'),
        createStatCard('Number of appropriations', '', String(appropriations.length), ''),
        createStatCard('Votes', '', String(new Set(appropriations.map(appropriation => appropriation.vote)).size), '')),
      isMinister ? createElement('p', { class: 'small', text: 'Minister as at ' + budgetReference.ministersAsAt + '. Check the current list of Ministers before quoting.' }) : null,
      createSection('Appropriations', createScrollableTable('person-table', 'Appropriations for ' + title)),
      createSourceFooter());
    const personTableState = createTableState({ sortKey: 'budget' });
    const columns = [
      { key: 'name', label: 'Appropriation', value: appropriation => createAppropriationNameCell(appropriation), csv: appropriation => appropriation.name },
      { key: 'vote', label: 'Vote', value: appropriation => createVoteLink(appropriation.vote), csv: appropriation => appropriation.vote },
      { key: 'type', label: 'Type', value: appropriation => appropriation.type, csv: appropriation => appropriation.type },
      { key: 'budget', label: '2026/27 ($000)', isNumeric: true, value: appropriation => formatThousands(getBudgetAmount(appropriation)), csv: getBudgetAmount }
    ];
    const redrawTable = () => renderTable(selectOne('#person-table'), columns, appropriations, personTableState, redrawTable, { rowClassName: getAppropriationRowClass });
    redrawTable();
  }

  
function renderItemHeader(titleText, sectorColour, linkToCopy) {
  const dialogElement = selectOne('#item-pop');
  const headerElement = selectOne('#item-head');
  const messageElement = createElement('span', { class: 'copy-msg', role: 'status' });
  const copyLink = async () => {
    messageElement.textContent = (await budgetModel.copyText(linkToCopy)) ? 'Link copied.' : 'Copy the address from your browser.';
  };

  dialogElement.style.setProperty('--c', sectorColour);

replaceElementChildren(headerElement,
    createElement('div', { class: 'item-action-bar' },
      createElement('button', { type: 'button', class: 'btn-small', id:'copylink', onclick: copyLink },
      'Copy link',
      createElement('span', { class: 'fa-solid fa-link', 'aria-hidden': 'true' })
      ),
      messageElement,
      createElement('button', { type: 'button', class: 'btn-small', 'data-close-item': true, id: 'close' },
      'Close',
      createElement('span', { class: 'fa-solid fa-xmark', 'aria-hidden': 'true' })
    )),
    createElement('div', { class: 'item-title-bar' },
      createElement('h2', { id: 'item-title', class: 'item-title', text: titleText })));
}

  function openItemDialog(itemKind, itemId) {
    const bodyElement = selectOne('#item-body');
    const wasFound = (itemKind === 'mya' ? renderMultiYearDetail : renderAppropriationDetail)(itemId, bodyElement);
    if (wasFound === false) return false;
    const itemRecord = (itemKind === 'mya' ? budgetCalculations.multiYearAppropriationById : budgetCalculations.appropriationById).get(itemId);
    const sectorColour = budgetCalculations.sectorForVote(itemRecord.vote).colour || 'var(--blue-dark)';
    renderItemHeader(bodyElement.querySelector('h1').textContent, sectorColour, location.href.split('#')[0] + '#/' + itemKind + '/' + itemId);
    bodyElement.querySelector('.page-head').remove();
    bodyElement.querySelector('.page-tools').remove();
    if (!itemDialog.open) itemDialog.showModal();
    selectOne('#item-pop .item-inner').scrollTop = 0;
    revealVisibleSections();
    return true;
  }

  function bindItemDialog() {
    itemDialog.addEventListener('close', () => {
      const firstPart = parseAddress().pathParts[0];
      if (firstPart !== 'appropriation' && firstPart !== 'mya') return;
      replaceAddressBar(firstPart === 'mya' ? '#/multi-year' : '#/appropriations');
      lastRoutedPath = parseAddress().pathParts.join('/');
    });
    itemDialog.addEventListener('click', event => { if (event.target === itemDialog || event.target.closest('[data-close-item]')) itemDialog.close(); });
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#/"]');
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const [, itemKind, encodedId] = link.getAttribute('href').split('/');
      if ((itemKind === 'appropriation' || itemKind === 'mya') && encodedId) {
        event.preventDefault();
        event.stopPropagation();
        openItemDialog(itemKind, decodeURIComponent(encodedId));
      } else if (itemDialog.open) itemDialog.close();
    }, true);
  }

  function renderHelp(anchorId) {
    replaceElementChildren(selectOne('#process-list'), budgetReference.process.map(step => createElement('li', {}, createElement('p', { class: 'process-when', text: step.when }), createElement('h3', { text: step.title }), createElement('p', { text: step.text }))));
    const sectorTable = selectOne('#sector-table');
    replaceElementChildren(sectorTable, sectorTable.querySelector('caption'),
      createElement('thead', {}, createElement('tr', {}, createElement('th', { scope: 'col', text: 'Sector' }), createElement('th', { scope: 'col', text: 'Votes' }), createElement('th', { scope: 'col', class: 'num', text: '2026/27 ($000)' }))),
      createElement('tbody', {}, budgetReference.sectors.map(sector => {
        const sectorVotes = budgetCalculations.votes.filter(vote => vote.sector.id === sector.id);
        return createElement('tr', {}, createElement('th', { scope: 'row' }, createSectorTag(sector)), createElement('td', {}, sectorVotes.map((vote, voteIndex) => [createLink('#/vote/' + vote.id, vote.name), voteIndex < sectorVotes.length - 1 ? ', ' : ''])),
          createElement('td', { class: 'num', text: formatThousands(sumAmounts(sectorVotes, vote => budgetCalculations.calculateVoteTotal(vote))) }));
      })));
    const redrawGlossary = () => {
      const searchText = selectOne('#gloss-search').value.trim().toLowerCase();
      const matchingEntries = budgetReference.glossary.slice().sort((first, second) => first.term.localeCompare(second.term)).filter(entry => !searchText || (entry.term + ' ' + entry.def).toLowerCase().includes(searchText));
      replaceElementChildren(selectOne('#gloss-list'), matchingEntries.map(entry => [createElement('dt', { id: 'term-' + entry.id, text: entry.term }), createElement('dd', { text: entry.def })]));
      selectOne('#gloss-count').textContent = matchingEntries.length + ' of ' + budgetReference.glossary.length + ' terms';
    };
    selectOne('#gloss-search').oninput = redrawGlossary;
    redrawGlossary();
    const downloadFiles = [
      ['appropriations-2026-27.csv', 'Appropriations 2026/27', 'Every annual appropriation and MCA category, with 2025/26 figures, Minister and department codes, and scope.', budgetCalculations.appropriations.length],
      ['multi-year-appropriations-2026-27.csv', 'Multi-year appropriations', 'Start and end dates, original and adjusted amounts, spending to date and amount remaining.', budgetCalculations.multiYearAppropriations.length],
      ['summary-of-financial-activity.csv', 'Summary of Financial Activity', 'Every value in the Summary of Financial Activity tables, one row per value: actuals 2021/22 to forecasts 2029/30.', budgetCalculations.budgetData.sfa.length]
    ];
    replaceElementChildren(selectOne('#download-list'), downloadFiles.map(([filename, title, description, rowCount]) => createElement('li', {},
      createElement('a', { href: 'data/downloads/' + filename, download: filename }, title, createElement('span', { class: 'file-meta', text: ' (CSV, ' + formatNumber(rowCount) + ' rows)' })), createElement('p', { class: 'small', text: description }))));
    replaceElementChildren(selectOne('#source-list'), Object.values(budgetReference.sources).map(source => createElement('li', {}, createSourceLink(source))));
    const anchorTarget = anchorId && document.getElementById(anchorId);
    if (anchorTarget) requestAnimationFrame(() => anchorTarget.scrollIntoView({ block: 'start' }));
  }


  const PAGE_TITLES = { overview: 'Budget 2026/27 dashboard', 
    votes: 'Votes', 
    appropriations: 'Appropriations', 'multi-year': 'Multi-year appropriations', 
    summary: 'Financial summary', 
    people: 'Ministers and departments', 
    help: 'Help and data' };
  const DETAIL_PAGE_NAVIGATION = { vote: 'votes', minister: 'people', department: 'people' };
  const POPUP_PAGE_PARENTS = { appropriation: 'appropriations', mya: 'multi-year' };
  const LIST_PAGE_RENDERERS = {
    overview: () => renderOverview(),
    votes: address => renderVotes(address.params),
    appropriations: address => renderAppropriations(address.params),
    'multi-year': () => renderMultiYear(),
    summary: () => renderSummary(),
    people: address => renderPeople(address.pathParts[1]),
    help: address => renderHelp(address.anchor)
  };
  let lastRoutedPath = null;
  let isFirstLoad = true;

  function parseAddress() {
    const [pathAndQuery, anchor] = (location.hash.replace(/^#/, '') || '/').split('#');
    const [path, query] = pathAndQuery.split('?');
    return { pathParts: path.split('/').filter(Boolean), params: Object.fromEntries(new URLSearchParams(query || '')), anchor };
  }

  const showPage = pageName => selectAll('main > .page').forEach(pageElement => (pageElement.hidden = pageElement.id !== 'page-' + pageName));

  function routeToCurrentAddress() {
    const address = parseAddress();
    const [page = 'overview', detailId] = address.pathParts;
    const routedPath = address.pathParts.join('/');
    const isSamePage = routedPath === lastRoutedPath;
    lastRoutedPath = routedPath;
    syncTransferCheckboxes();
    chartTooltip.hide();
    if (!POPUP_PAGE_PARENTS[page] && itemDialog.open) itemDialog.close();
    selectOne('#site-nav').classList.remove('is-open');
    selectOne('#menu-btn').setAttribute('aria-expanded', 'false');
    selectAll('.site-nav [data-nav]').forEach(navLink => navLink.setAttribute('aria-current', navLink.dataset.nav === (DETAIL_PAGE_NAVIGATION[page] || POPUP_PAGE_PARENTS[page] || page) ? 'page' : 'false'));

    let shownPageName = page;
    if (DETAIL_PAGE_NAVIGATION[page]) {
      showPage('detail');
      shownPageName = 'detail';
      const wasFound = page === 'vote' ? renderVotePage(detailId) : renderPersonPage(page, detailId);
      if (wasFound === false) { showPage('notfound'); shownPageName = 'notfound'; }
    } else if (POPUP_PAGE_PARENTS[page]) {
      shownPageName = POPUP_PAGE_PARENTS[page];
      showPage(shownPageName);
      LIST_PAGE_RENDERERS[shownPageName]({ params: {}, pathParts: [], anchor: null });
      if (!openItemDialog(page, detailId)) showPage('notfound');
    } else if (PAGE_TITLES[page]) {
      showPage(page);
      document.title = (page === 'overview' ? '' : PAGE_TITLES[page] + ' - ') + 'Budget 2026/27 dashboard - Parliamentary Library';
      LIST_PAGE_RENDERERS[page](address);
    } else {
      showPage('notfound');
      shownPageName = 'notfound';
    }
    if (!isSamePage && !address.anchor) {
      window.scrollTo(0, 0);
      const headingElement = selectOne('#page-' + shownPageName + ' h1');
      if (headingElement && !isFirstLoad) headingElement.focus({ preventScroll: true });
    }
    isFirstLoad = false;
    revealVisibleSections();
  }

  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) return; entry.target.classList.add('is-in'); revealObserver.unobserve(entry.target); }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    : null;

  function revealVisibleSections() {
    if (!revealObserver || prefersReducedMotion()) return;
    selectAll('main > .page:not([hidden]) :is(' + REVEAL_SELECTOR + ')').forEach(section => {
      if (section.classList.contains('reveal') || section.parentElement.closest('.reveal')) return;
      section.classList.add('reveal');
      revealObserver.observe(section);
    });
  }

  function bindGlossaryDialog() {
    document.addEventListener('click', event => {
      const termElement = event.target.closest('[data-term]');
      if (termElement) { event.preventDefault(); openGlossaryTerm(termElement.dataset.term); }
      if (event.target.closest('[data-close]')) glossaryDialog.close();
    });
    glossaryDialog.addEventListener('click', event => event.target === glossaryDialog && glossaryDialog.close());
    selectOne('#pop-body').addEventListener('click', event => event.target.closest('a') && glossaryDialog.close());
  }

  function bindHelpNavigation() {
    const navigationLinks = selectAll('.information-nav .nav-tab');
    const getSectionId = link => link.getAttribute('href').split('#')[2];
    const sectionElements = navigationLinks.map(link => document.getElementById(getSectionId(link))).filter(Boolean);
    if (!sectionElements.length) return;
    let pinnedSectionId = null;

    const setActiveSection = sectionId => navigationLinks.forEach(link => link.classList.toggle('is-active', getSectionId(link) === sectionId));

    const updateActiveLink = () => {
      if (selectOne('#page-help').hidden) return;
      if (pinnedSectionId) {
        setActiveSection(pinnedSectionId);
        return;
      }
      const scrollableDistance = document.documentElement.scrollHeight - window.innerHeight;
      const distanceFromBottom = scrollableDistance - window.scrollY;
      const bottomZoneHeight = window.innerHeight * 0.5;
      const bottomProgress = scrollableDistance > 0 ? Math.min(1, Math.max(0, 1 - distanceFromBottom / bottomZoneHeight)) : 0;
      const triggerLine = window.innerHeight * (0.3 + 0.7 * bottomProgress);
      const currentSection = sectionElements.filter(sectionElement => sectionElement.getBoundingClientRect().top <= triggerLine).pop() || sectionElements[0];
      setActiveSection(currentSection.id);
    };

    const pinSection = sectionId => {
      pinnedSectionId = sectionId;
      updateActiveLink();
    };

    navigationLinks.forEach(link => link.addEventListener('click', () => pinSection(getSectionId(link))));
    window.addEventListener('hashchange', () => pinSection(parseAddress().anchor || null));
    ['wheel', 'touchmove', 'keydown', 'mousedown'].forEach(eventName => window.addEventListener(eventName, () => { pinnedSectionId = null; }, { passive: true }));
    window.addEventListener('scroll', updateActiveLink, { passive: true });
    pinSection(parseAddress().anchor || null);
  }

  function bindPageControls() {
    window.addEventListener('hashchange', routeToCurrentAddress);
    selectOne('#menu-btn').addEventListener('click', () => selectOne('#menu-btn').setAttribute('aria-expanded', String(selectOne('#site-nav').classList.toggle('is-open'))));
    document.addEventListener('change', event => {
      const transferCheckbox = event.target.closest('[data-setting=transfers]');
      if (!transferCheckbox) return;
      budgetModel.updateDashboardDisplayOption('includeTransfers', transferCheckbox.checked);
      syncTransferCheckboxes();
      routeToCurrentAddress();
    });
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]:not([href^="#/"])');
      const target = link && link.getAttribute('href') !== '#' && document.getElementById(link.getAttribute('href').slice(1));
      if (!target) return;
      event.preventDefault();
      target.setAttribute('tabindex', '-1');
      target.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      target.focus({ preventScroll: true });
      target.classList.remove('is-target');
      void target.offsetWidth;
      target.classList.add('is-target');
    });
    selectAll('input[name="ov-group"]').forEach(radio => radio.addEventListener('change', renderOverview));
    selectOne('#votes-search').addEventListener('input', () => renderVotes({}));
    selectOne('#votes-sector').addEventListener('change', () => renderVotes({}));
    bindAppropriationControls();
    ['#mya-search', '#mya-vote', '#mya-type', '#mya-ends'].forEach(selector => selectOne(selector).addEventListener(selector === '#mya-search' ? 'input' : 'change', () => { multiYearTableState.pageNumber = 1; renderMultiYear(); }));
    selectAll('input[name="sfa-side"], input[name="sfa-unit"]').forEach(radio => radio.addEventListener('change', renderSummary));
    selectOne('#sfa-sector').addEventListener('change', renderSummary);
    selectOne('#sfa-vote').addEventListener('change', () => {
      const selectedVote = budgetCalculations.voteByName.get(selectOne('#sfa-vote').value);
      if (selectedVote) expandedVoteIds.add(selectedVote.id);
      renderSummary();
    });
    selectOne('#people-search').addEventListener('input', () => renderPeople(parseAddress().pathParts[1]));
    chartTooltip.bind(document.body);
  }
  bindHelpNavigation();
  bindGlossaryDialog();
  bindItemDialog();
  fillPagePlaceholders();
  renderAboutBox();
  renderCitation();
  bindPageControls();
  routeToCurrentAddress();
})();