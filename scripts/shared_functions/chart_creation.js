/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      chart_ctreation.js
Purpose:     Reusable functions for the creation of bar, column, and donut charts
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/
'use strict';
window.ChartTools = (() => {
  const { createElement } = window.UtilityHelpers;

  const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
  const DEFAULT_BAR_COLOUR = 'var(--blue-dark)';
  const MINIMUM_BAR_WIDTH_PERCENT = 0.4;
  const MINIMUM_CHART_WIDTH = 300;
  const DEFAULT_CHART_WIDTH = 760;
  const MAXIMUM_CHART_WIDTH = 1100;
  const NARROW_BAND_WIDTH = 64;
  const MAXIMUM_COLUMN_WIDTH = 28;
  const COLUMN_GAP = 2;
  const REDRAW_WIDTH_THRESHOLD = 4;

  function createColourKey(colour, isHatched = false, extraClassName = '') {
    return createElement('span', {
      class: ['key', isHatched && 'is-hatched', extraClassName].filter(Boolean).join(' '),
      'aria-hidden': 'true',
      style: { '--c': colour }
    });
  }

  function renderLegend(listElement, entries) {
    listElement.replaceChildren(
      ...entries.map(entry =>
        createElement('li', {}, createColourKey(entry.colour, entry.isHatched, entry.keyClassName), entry.label)
      )
    );
  }

  function createRowLabel(row) {
    if (row.onSelect) {
      return createElement('button', { type: 'button', class: 'link-btn', text: row.label, onclick: () => row.onSelect(row.id) });
    }
    return row.href ? createElement('a', { href: row.href, text: row.label }) : createElement('span', { text: row.label });
  }

  function renderBars(hostElement, rows, options = {}) {
    const maximumValue = options.maximumValue || Math.max(...rows.map(row => row.value), 1);
    const getTooltip = options.getTooltip || (row => row.label + ': ' + row.valueText);
    const listElement = createElement('ol', { class: 'bar-list' + (options.isCompact ? ' bar-list-compact' : '') });

    rows.forEach(row => {
      const glossaryButton = row.glossaryTerm
        ? createElement('button', {
            type: 'button',
            class: 'info',
            'data-term': row.glossaryTerm,
            'aria-label': 'What is ' + row.label + '?',
            text: '?'
          })
        : null;
      const barElement = createElement('span', {
        class: 'bar' + (row.isHatched ? ' is-hatched' : ''),
        style: {
          width: Math.max(MINIMUM_BAR_WIDTH_PERCENT, (row.value / maximumValue) * 100) + '%',
          '--c': row.colour || options.defaultColour || DEFAULT_BAR_COLOUR
        },
        'data-tip': row.tooltip || getTooltip(row)
      });
      listElement.append(
        createElement(
          'li',
          {},
          createElement(
            'div',
            { class: 'bar-label' },
            createRowLabel(row),
            glossaryButton,
            row.subLabel ? createElement('span', { class: 'bar-sub', text: row.subLabel }) : null
          ),
          createElement('div', { class: 'bar-track' }, barElement),
          createElement('span', { class: 'bar-value', text: row.valueText })
        )
      );
    });
    hostElement.replaceChildren(listElement);
  }

  

  function renderChangeBars(hostElement, rows, options = {}) {
    const maximumAbsoluteValue = options.maximumAbsoluteValue || Math.max(...rows.map(row => Math.abs(row.value)), 1);
    const getTooltip = options.getTooltip || (row => row.label + ': ' + row.valueText + (row.subLabel ? ', ' + row.subLabel : ''));
    const listElement = createElement('ol', { class: 'change-list' });

    rows.forEach(row => {
      const halfWidthPercent = Math.min(1, Math.abs(row.value) / maximumAbsoluteValue) * 50;
      const barElement = createElement('span', {
        class: ['change-bar', row.isHatched && 'is-hatched', row.extraClassName].filter(Boolean).join(' '),
        style: {
          left: (row.value < 0 ? 50 - halfWidthPercent : 50) + '%',
          width: Math.max(0.3, halfWidthPercent) + '%',
          '--c': row.colour || options.defaultColour || DEFAULT_BAR_COLOUR
        },
        'data-tip': row.tooltip || getTooltip(row)
      });
      listElement.append(
        createElement(
          'li',
          { class: row.value < 0 ? 'is-down' : 'is-up' },
          createElement('div', { class: 'bar-label' }, createRowLabel(row)),
          createElement('div', { class: 'change-track' }, barElement),
          createElement(
            'span',
            { class: 'bar-value' },
            createElement('b', { text: row.valueText }),
            row.subLabel ? createElement('span', { text: row.subLabel }) : null
          )
        )
      );
    });
    hostElement.replaceChildren(listElement);
  }

  function renderLifecycleBar(hostElement, segments, totalValue) {
    const barElement = createElement('div', { class: 'life-bar' });
    segments
      .filter(segment => segment.value > 0)
      .forEach(segment =>
        barElement.append(
          createElement('span', {
            class: 'life-part' + (segment.isHatched ? ' is-hatched' : ''),
            style: { width: (segment.value / totalValue) * 100 + '%', '--c': segment.colour },
            'data-tip': segment.label + ': ' + segment.valueText
          })
        )
      );
    const legendElement = createElement('ul', { class: 'legend' });
    renderLegend(
      legendElement,
      segments.map(segment => ({
        label: segment.label + ': ' + segment.valueText,
        colour: segment.colour,
        isHatched: segment.isHatched
      }))
    );
    hostElement.replaceChildren(barElement, legendElement);
  }

  function calculateNiceStep(roughStep) {
    const powerOfTen = 10 ** Math.floor(Math.log10(roughStep));
    const normalisedStep = roughStep / powerOfTen;
    return (normalisedStep <= 1 ? 1 : normalisedStep <= 2 ? 2 : normalisedStep <= 5 ? 5 : 10) * powerOfTen;
  }

  function createSvgElement(tagName, attributes = {}, text) {
    const svgElement = document.createElementNS(SVG_NAMESPACE, tagName);
    Object.entries(attributes).forEach(([name, value]) => value != null && svgElement.setAttribute(name, value));
    if (text != null) svgElement.textContent = text;
    return svgElement;
  }

  function renderColumnChart(hostElement, yearLabels, seriesList, options = {}) {
    hostElement.columnChartArguments = [yearLabels, seriesList, options];
    columnResizeObserver.observe(hostElement);

    const formatValue = options.formatValue || String;
    const hatchPatternId = options.hatchPatternId || 'column-hatch';
    const chartWidth = Math.max(MINIMUM_CHART_WIDTH, Math.min(hostElement.clientWidth || DEFAULT_CHART_WIDTH, MAXIMUM_CHART_WIDTH));
    const isNarrow = chartWidth / yearLabels.length < NARROW_BAND_WIDTH;
    const chartHeight = isNarrow ? 260 : 300;
    const margin = { top: 16, right: 4, bottom: isNarrow ? 30 : 46, left: 0 };

    const stackedTotals = seriesList.flatMap(series =>
      series.values.map((value, yearIndex) => value + ((series.extraValues && series.extraValues[yearIndex]) || 0))
    );
    const highestTotal = Math.max(...stackedTotals, 1);
    const tickStep = calculateNiceStep(highestTotal / 4);
    const tickCount = Math.ceil(highestTotal / tickStep);
    const axisMaximum = tickStep * tickCount;

    margin.left = Math.max(40, String(formatValue(axisMaximum)).length * 7 + 14);
    const plotWidth = chartWidth - margin.left - margin.right;
    const plotHeight = chartHeight - margin.top - margin.bottom;
    const bandWidth = plotWidth / yearLabels.length;
    const columnWidth = Math.min(MAXIMUM_COLUMN_WIDTH, (bandWidth * 0.76) / seriesList.length);
    const groupWidth = seriesList.length * columnWidth + (seriesList.length - 1) * COLUMN_GAP;
    const toVerticalPosition = value => margin.top + plotHeight - (value / axisMaximum) * plotHeight;

    const svgElement = createSvgElement('svg', {
      viewBox: `0 0 ${chartWidth} ${chartHeight}`,
      class: 'columns',
      role: 'img',
      'aria-label': options.ariaLabel || 'Column chart. Use "Show as table" for the figures.'
    });

    const hatchPattern = createSvgElement('pattern', {
      id: hatchPatternId,
      width: 6,
      height: 6,
      patternUnits: 'userSpaceOnUse',
      patternTransform: 'rotate(45)'
    });
    hatchPattern.append(
      createSvgElement('rect', { width: 6, height: 6, fill: '#ffffff' }),
      createSvgElement('rect', { width: 3, height: 6, fill: '#757575' })
    );
    const definitionsElement = createSvgElement('defs');
    definitionsElement.append(hatchPattern);
    svgElement.append(definitionsElement);

    if (options.forecastFromIndex != null) {
      const forecastLeft = margin.left + bandWidth * options.forecastFromIndex;
      svgElement.append(
        createSvgElement('rect', {
          x: forecastLeft,
          y: margin.top,
          width: margin.left + plotWidth - forecastLeft,
          height: plotHeight,
          class: 'col-forecast-bg'
        }),
        createSvgElement('text', { x: forecastLeft + 6, y: margin.top + 12, class: 'col-note' }, options.forecastLabel || 'Forecast')
      );
    }

    for (let tickIndex = 0; tickIndex <= tickCount; tickIndex++) {
      const tickValue = tickStep * tickIndex;
      svgElement.append(
        createSvgElement('line', {
          x1: margin.left,
          x2: margin.left + plotWidth,
          y1: toVerticalPosition(tickValue),
          y2: toVerticalPosition(tickValue),
          class: tickIndex ? 'col-grid' : 'col-axis'
        }),
        createSvgElement(
          'text',
          { x: margin.left - 8, y: toVerticalPosition(tickValue) + 4, class: 'col-tick', 'text-anchor': 'end' },
          formatValue(tickValue)
        )
      );
    }

    yearLabels.forEach((yearLabel, yearIndex) => {
      const bandCentre = margin.left + bandWidth * yearIndex + bandWidth / 2;
      const isLabelSkipped = bandWidth < 44 && yearIndex % 2;
      if (!isLabelSkipped) {
        svgElement.append(
          createSvgElement(
            'text',
            { x: bandCentre, y: chartHeight - margin.bottom + 18, class: 'col-tick', 'text-anchor': 'middle' },
            isNarrow ? yearLabel.slice(2) : yearLabel
          )
        );
      }
      if (!isNarrow && options.yearNotes && options.yearNotes[yearIndex]) {
        svgElement.append(
          createSvgElement(
            'text',
            { x: bandCentre, y: chartHeight - margin.bottom + 34, class: 'col-sub', 'text-anchor': 'middle' },
            options.yearNotes[yearIndex]
          )
        );
      }

      seriesList.forEach((series, seriesIndex) => {
        const value = series.values[yearIndex];
        if (value == null) return;
        const extraValue = (series.extraValues && series.extraValues[yearIndex]) || 0;
        const columnLeft = bandCentre - groupWidth / 2 + seriesIndex * (columnWidth + COLUMN_GAP);
        const isForecast = options.forecastFromIndex != null && yearIndex >= options.forecastFromIndex;
        const columnGroup = createSvgElement('g', {
          tabindex: '0',
          class: 'col-hit',
          'data-tip':
            `${series.name}, ${yearLabel}: ${formatValue(value, true)}` +
            (extraValue ? ` plus ${formatValue(extraValue, true)} ${series.extraLabel}` : '')
        });
        columnGroup.append(
          createSvgElement('rect', {
            x: columnLeft,
            y: toVerticalPosition(value),
            width: columnWidth,
            height: Math.max(0, toVerticalPosition(0) - toVerticalPosition(value)),
            fill: series.colour,
            class: 'col' + (isForecast ? ' col-is-forecast' : '')
          })
        );
        if (extraValue) {
          columnGroup.append(
            createSvgElement('rect', {
              x: columnLeft,
              y: toVerticalPosition(value + extraValue),
              width: columnWidth,
              height: Math.max(0, toVerticalPosition(value) - toVerticalPosition(value + extraValue) - 2),
              fill: `url(#${hatchPatternId})`,
              class: 'col col-extra'
            })
          );
        }
        svgElement.append(columnGroup);
      });
    });

    hostElement.replaceChildren(svgElement);
  }
  function wrapLabelLines(label, maximumCharacters) {
    const lines = [];
    let currentLine = '';
    label.split(' ').forEach(word => {
      const candidateLine = currentLine ? currentLine + ' ' + word : word;
      if (candidateLine.length > maximumCharacters && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else currentLine = candidateLine;
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  function renderCategoryColumnChart(hostElement, rows, options = {}) {
    const formatValue = options.formatValue || String;
    const chartWidth = DEFAULT_CHART_WIDTH;
    const plotHeight = 240;
    const highestValue = Math.max(options.maximumValue || 0, ...rows.map(row => row.value), 1);
    const tickStep = calculateNiceStep(highestValue / 4);
    const tickCount = Math.ceil(highestValue / tickStep);
    const axisMaximum = tickStep * tickCount;
    const marginLeft = Math.max(40, String(formatValue(axisMaximum)).length * 7 + 14);
    const marginRight = 8;
    const marginTop = 16;
    const plotWidth = chartWidth - marginLeft - marginRight;
    const bandWidth = plotWidth / rows.length;
    const columnWidth = Math.min(48, bandWidth * 0.65);
    const isRotated = Boolean(options.rotateLabels);
    const labelLines = rows.map(row => (isRotated ? [row.label] : wrapLabelLines(row.label, Math.max(6, Math.floor(bandWidth / 7)))));
    const longestLabelLength = Math.max(...rows.map(row => row.label.length));
    const marginBottom = isRotated ? Math.min(220, Math.ceil(longestLabelLength * 6 * 0.71) + 24) : Math.max(...labelLines.map(lines => lines.length)) * 14 + 24;
    const chartHeight = marginTop + plotHeight + marginBottom;
    const plotBottom = marginTop + plotHeight;
    const toVerticalPosition = value => plotBottom - (value / axisMaximum) * plotHeight;

    const svgElement = createSvgElement('svg', {
      viewBox: `0 0 ${chartWidth} ${chartHeight}`,
      class: 'columns',
      role: 'img',
      'aria-label': options.ariaLabel || 'Column chart. Use the tooltips for the figures.'
    });

    for (let tickIndex = 0; tickIndex <= tickCount; tickIndex++) {
      const tickValue = tickStep * tickIndex;
      svgElement.append(
        createSvgElement('line', { x1: marginLeft, x2: marginLeft + plotWidth, y1: toVerticalPosition(tickValue), y2: toVerticalPosition(tickValue), class: tickIndex ? 'col-grid' : 'col-axis' }),
        createSvgElement('text', { x: marginLeft - 8, y: toVerticalPosition(tickValue) + 4, class: 'col-tick', 'text-anchor': 'end' }, formatValue(tickValue))
      );
    }

    rows.forEach((row, rowIndex) => {
      const bandCentre = marginLeft + bandWidth * rowIndex + bandWidth / 2;
      const columnGroup = createSvgElement('g', { tabindex: '0', class: 'col-hit', 'data-tip': row.tooltip || row.label + ': ' + row.valueText });
      columnGroup.append(createSvgElement('rect', {
        x: bandCentre - columnWidth / 2,
        y: toVerticalPosition(row.value),
        width: columnWidth,
        height: Math.max(0, plotBottom - toVerticalPosition(row.value)),
        fill: row.colour || DEFAULT_BAR_COLOUR,
        class: 'col'
      }));
      svgElement.append(columnGroup);

      if (isRotated) {
        const labelBaseline = plotBottom + 14;
        svgElement.append(createSvgElement('text', { x: bandCentre, y: labelBaseline, class: 'col-tick', 'text-anchor': 'end', transform: `rotate(-45 ${bandCentre} ${labelBaseline})` }, row.label));
        return;
      }
      const labelElement = createSvgElement('text', { x: bandCentre, y: plotBottom + 18, class: 'col-tick', 'text-anchor': 'middle' });
      labelLines[rowIndex].forEach((line, lineIndex) => labelElement.append(createSvgElement('tspan', { x: bandCentre, dy: lineIndex ? 14 : 0 }, line)));
      svgElement.append(labelElement);
    });

    hostElement.replaceChildren(svgElement);
  }

  function renderDonutChart(hostElement, segments, options = {}) {
    const donutSize = options.size || 200;
    const strokeWidth = options.strokeWidth || 36;
    const centrePosition = donutSize / 2;
    const radius = (donutSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const totalValue = segments.reduce((runningTotal, segment) => runningTotal + (segment.value || 0), 0);

    const svgElement = createSvgElement('svg', {
      viewBox: `0 0 ${donutSize} ${donutSize}`,
      class: 'donut',
      role: 'img',
      'aria-label': options.ariaLabel || 'Donut chart. Use the legend for the figures.'
    });
    svgElement.append(createSvgElement('circle', { cx: centrePosition, cy: centrePosition, r: radius, fill: 'none', stroke: '#e6e6e6', 'stroke-width': strokeWidth }));

    let precedingLength = 0;
    segments.forEach(segment => {
      if (!totalValue || !segment.value) return;
      const segmentLength = (segment.value / totalValue) * circumference;
      svgElement.append(createSvgElement('circle', {
        cx: centrePosition,
        cy: centrePosition,
        r: radius,
        fill: 'none',
        'stroke-width': strokeWidth,
        'stroke-dasharray': `${segmentLength} ${circumference - segmentLength}`,
        'stroke-dashoffset': -precedingLength,
        transform: `rotate(-90 ${centrePosition} ${centrePosition})`,
        stroke: segment.colour,
        tabindex: '0',
        class: 'donut-segment',
        'data-tip': segment.tooltip || segment.label + ': ' + segment.valueText
      }));
      precedingLength += segmentLength;
    });

    const legendElement = createElement('ul', { class: 'legend' });
    renderLegend(legendElement, segments.map(segment => ({ label: segment.label + ': ' + segment.valueText, colour: segment.colour })));
    hostElement.replaceChildren(createElement('div', { class: 'donut-wrap' }, svgElement, legendElement));
  }

  const columnResizeObserver = new ResizeObserver(entries =>
    entries.forEach(({ target }) => {
      const hasMovedEnough = Math.abs(target.clientWidth - (target.lastRenderedWidth || 0)) > REDRAW_WIDTH_THRESHOLD;
      if (!target.columnChartArguments || !hasMovedEnough) return;
      target.lastRenderedWidth = target.clientWidth;
      renderColumnChart(target, ...target.columnChartArguments);
    })
  );

  return { createColourKey, renderLegend, renderBars, renderChangeBars, renderLifecycleBar, renderColumnChart, renderCategoryColumnChart, renderDonutChart };})();