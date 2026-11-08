/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      table_functions.js
Purpose:     Provides functions for  creating and handling tables
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/

'use strict';
window.TableTools = (() => {
  const { selectOne, createElement } = window.UtilityHelpers;
  const { downloadCsv } = window.CsvTools;

  const DEFAULT_PAGE_SIZE_OPTIONS = [25, 50, 100];
  const DEFAULT_EMPTY_MESSAGE = 'Nothing matches. Try clearing a filter.';

  const createTableState = ({ sortKey = null, sortDirection = -1, pageSize = 0 } = {}) => ({
    sortKey,
    sortDirection,
    pageNumber: 1,
    pageSize
  });

  const getCellClassName = column => [column.isNumeric && 'num', column.className].filter(Boolean).join(' ');

  function compareValues(firstValue, secondValue) {
    if (typeof firstValue === 'number' || typeof secondValue === 'number') {
      const firstNumber = firstValue ?? -Infinity;
      const secondNumber = secondValue ?? -Infinity;
      return firstNumber === secondNumber ? 0 : firstNumber < secondNumber ? -1 : 1;
    }
    return String(firstValue ?? '').localeCompare(String(secondValue ?? ''));
  }

  // sortRows, Sorts the rows based on the current state and column definitions, returns the sorted rows
  function sortRows(rows, columns, state) {
    const sortColumn = columns.find(column => column.key === state.sortKey);
    if (!sortColumn) return rows;
    const getSortValue = sortColumn.sortValue || sortColumn.csv || sortColumn.value;
    return rows
      .slice()
      .sort((firstRow, secondRow) => compareValues(getSortValue(firstRow), getSortValue(secondRow)) * state.sortDirection);
  }

  function getPageRows(sortedRows, state) {
    if (!state.pageSize) return sortedRows;
    const firstRowIndex = (state.pageNumber - 1) * state.pageSize;
    return sortedRows.slice(firstRowIndex, firstRowIndex + state.pageSize);
  }

  function createHeaderCell(column, state, isSortingDisabled, onStateChange) {
    const isActiveSortColumn = column.key === state.sortKey;
    const headerCell = createElement('th', {
      scope: 'col',
      class: getCellClassName(column),
      'aria-sort': isActiveSortColumn ? (state.sortDirection === 1 ? 'ascending' : 'descending') : null
    });
    if (column.isUnsortable || isSortingDisabled) {
      headerCell.append(column.label);
      return headerCell;
    }
    const sortIconText = isActiveSortColumn ? (state.sortDirection === 1 ? '▲' : '▼') : '';
    headerCell.append(
      createElement(
        'button',
        {
          type: 'button',
          class: 'sort-btn',
          onclick: () => {
            if (isActiveSortColumn) state.sortDirection = -state.sortDirection;
            else {
              state.sortKey = column.key;
              state.sortDirection = column.isNumeric ? -1 : 1;
            }
            state.pageNumber = 1;
            onStateChange(state);
          }
        },
        column.label,
        createElement('span', { class: 'sort-icon', 'aria-hidden': 'true', text: sortIconText })
      )
    );
    return headerCell;
  }

  function createBodyRow(row, columns, rowClassName) {
    return createElement(
      'tr',
      { class: rowClassName ? rowClassName(row) : null },
      columns.map((column, columnIndex) =>
        createElement(
          columnIndex === 0 ? 'th' : 'td',
          { scope: columnIndex === 0 ? 'row' : null, class: getCellClassName(column) },
          column.value(row)
        )
      )
    );
  }

  function renderTable(tableElement, columns, rows, state, onStateChange, options = {}) {
    const captionElement = tableElement.querySelector('caption');
    tableElement.replaceChildren(...(captionElement ? [captionElement] : []));

    const sortedRows = options.keepOrder ? rows : sortRows(rows, columns, state);
    const shownRows = getPageRows(sortedRows, state);
    const headerRow = createElement(
      'tr',
      {},
      columns.map(column => createHeaderCell(column, state, options.keepOrder, onStateChange))
    );
    const bodyElement = createElement('tbody');

    if (!shownRows.length) {
      bodyElement.append(
        createElement(
          'tr',
          {},
          createElement('td', {
            colspan: columns.length,
            class: 'empty',
            text: options.emptyMessage || DEFAULT_EMPTY_MESSAGE
          })
        )
      );
    }
    shownRows.forEach(row => bodyElement.append(createBodyRow(row, columns, options.rowClassName)));

    tableElement.append(createElement('thead', {}, headerRow), bodyElement);
    if (options.footerElement) tableElement.append(options.footerElement);
    return sortedRows;
  }

  function createTotalFooter(label, valueText) {
    return createElement(
      'tfoot',
      {},
      createElement(
        'tr',
        {},
        createElement('th', { scope: 'row', text: label }),
        createElement('td', { class: 'num', text: valueText })
      )
    );
  }

  function renderPager(hostElement, totalRowCount, state, onStateChange, pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS) {
    const pageCount = Math.max(1, Math.ceil(totalRowCount / state.pageSize));
    state.pageNumber = Math.min(state.pageNumber, pageCount);
    const changeState = changes => {
      Object.assign(state, changes);
      onStateChange(state);
    };
    hostElement.replaceChildren(
      createElement('button', {
        type: 'button',
        class: 'btn-small',
        text: 'Previous',
        disabled: state.pageNumber <= 1,
        onclick: () => changeState({ pageNumber: state.pageNumber - 1 })
      }),
      createElement('span', { class: 'pager-info', text: 'Page ' + state.pageNumber + ' of ' + pageCount }),
      createElement('button', {
        type: 'button',
        class: 'btn-small',
        text: 'Next',
        disabled: state.pageNumber >= pageCount,
        onclick: () => changeState({ pageNumber: state.pageNumber + 1 })
      }),
      createElement(
        'label',
        { class: 'pager-size' },
        'Rows per page ',
        createElement(
          'select',
          { onchange: event => changeState({ pageSize: Number(event.target.value), pageNumber: 1 }) },
          pageSizeOptions.map(optionSize =>
            createElement('option', {
              value: optionSize,
              selected: optionSize === state.pageSize,
              text: String(optionSize)
            })
          )
        )
      )
    );
  }

  const uniqueSortedValues = (rows, fieldName) =>
    [...new Set(rows.map(row => row[fieldName]).filter(Boolean))].sort((firstValue, secondValue) =>
      firstValue.localeCompare(secondValue)
    );

  function fillSelectOptions(selectElement, allOptionLabel, optionValues, selectedValue) {
    selectElement.replaceChildren(
      createElement('option', { value: '', text: allOptionLabel }),
      ...optionValues.map(optionValue => createElement('option', { value: optionValue, text: optionValue }))
    );
    selectElement.value = optionValues.includes(selectedValue) ? selectedValue : '';
  }

  function rowMatchesSearch(searchText, searchableTextParts) {
    const searchableText = searchableTextParts.join(' ').toLowerCase();
    return searchText
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every(searchWord => searchableText.includes(searchWord));
  }

  const toCsvColumns = columns =>
    columns.map(column => ({ label: column.csvLabel || column.label, csv: column.csv || column.value }));

  const downloadTableCsv = (filename, columns, rows) => downloadCsv(filename, toCsvColumns(columns), rows);

  function renderChartTableTools({ id, filename, rows, columns }) {
    const toolsElement = selectOne('[data-chart-tools="' + id + '"]');
    if (!toolsElement) return;

    const chartBodyElement = toolsElement.parentElement.querySelector('.chart-body');
    const wasTableOpen = toolsElement.dataset.open === '1';
    const tableElement = createElement('table', { class: 'data-table' });
    renderTable(tableElement, columns, rows, createTableState(), null, { keepOrder: true });

    const tableWrapperElement = createElement(
      'div',
      { class: 'table-scroll chart-table', hidden: !wasTableOpen },
      tableElement
    );
    const toggleButton = createElement('button', {
      type: 'button',
      class: 'btn-small',
      'aria-expanded': String(wasTableOpen),
      text: wasTableOpen ? 'Show as chart' : 'Show as table',
      onclick: () => {
        const isOpening = toggleButton.getAttribute('aria-expanded') !== 'true';
        toggleButton.setAttribute('aria-expanded', String(isOpening));
        toggleButton.textContent = isOpening ? 'Show as chart' : 'Show as table';
        tableWrapperElement.hidden = !isOpening;
        if (chartBodyElement) chartBodyElement.hidden = isOpening;
        toolsElement.dataset.open = isOpening ? '1' : '';
      }
    });
    const downloadButton = createElement('button', {
      type: 'button',
      class: 'btn-small',
      text: 'Download CSV',
      onclick: () => downloadTableCsv(filename, columns, rows)
    });

    if (chartBodyElement) chartBodyElement.hidden = wasTableOpen;
    toolsElement.replaceChildren(createElement('div', { class: 'button-row' }, toggleButton, downloadButton), tableWrapperElement);
  }

  return {
    createTableState,
    sortRows,
    renderTable,
    renderPager,
    createTotalFooter,
    uniqueSortedValues,
    fillSelectOptions,
    rowMatchesSearch,
    toCsvColumns,
    downloadTableCsv,
    renderChartTableTools
  };
})();