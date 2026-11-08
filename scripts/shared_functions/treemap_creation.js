/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      treemap_creation.js
Purpose:     Functions for teh creation and customisation of treemaps.
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/
'use strict';
window.TreeMapCreator = (() => {
  const { createElement } = window.UtilityHelpers;

  const SMALL_BOX_MINIMUM_WIDTH = 84;
  const TINY_BOX_MINIMUM_SIZE = 24;
  const AVERAGE_CHARACTER_WIDTH = 7.5;
  const LABEL_HORIZONTAL_PADDING = 16;
  const LABEL_LINE_HEIGHT = 17;
  const DARK_LUMINANCE_THRESHOLD = 0.18;
  const DEFAULT_BOX_COLOUR = '#acacac';

  const colourProbeElement = document.createElement('span');
  const darkColourCache = {};

  const sumValues = items => items.reduce((runningTotal, item) => runningTotal + item.value, 0);

  function resolveColourToRgb(cssColour) {
    colourProbeElement.style.color = cssColour;
    document.body.append(colourProbeElement);
    const resolvedColour = getComputedStyle(colourProbeElement).color;
    colourProbeElement.remove();
    return resolvedColour;
  }

  function isColourDark(cssColour) {
    if (cssColour in darkColourCache) return darkColourCache[cssColour];
    const [red, green, blue] = resolveColourToRgb(cssColour).match(/\d+(\.\d+)?/g).map(Number);
    const toLinear = channel => ((channel /= 255) <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);
    
    return (darkColourCache[cssColour] = luminance < DARK_LUMINANCE_THRESHOLD);
  }

  function calculateLayout(items, left, top, width, height, placedBoxes = []) {
    if (!items.length) return placedBoxes;
    if (items.length === 1) {
      placedBoxes.push({ ...items[0], left, top, width, height });
      return placedBoxes;
    }

    const totalValue = sumValues(items);
    let firstGroupValue = 0;
    let splitIndex = 0;
    while (splitIndex < items.length - 1 && firstGroupValue + items[splitIndex].value / 2 < totalValue / 2) {
      firstGroupValue += items[splitIndex].value;
      splitIndex++;
    }
    if (splitIndex === 0) {
      splitIndex = 1;
      firstGroupValue = items[0].value;
    }

    const firstGroup = items.slice(0, splitIndex);
    const secondGroup = items.slice(splitIndex);
    const firstGroupShare = totalValue ? firstGroupValue / totalValue : 0.5;

    if (width >= height) {
      calculateLayout(firstGroup, left, top, width * firstGroupShare, height, placedBoxes);
      calculateLayout(secondGroup, left + width * firstGroupShare, top, width * (1 - firstGroupShare), height, placedBoxes);
    } else {
      calculateLayout(firstGroup, left, top, width, height * firstGroupShare, placedBoxes);
      calculateLayout(secondGroup, left, top + height * firstGroupShare, width, height * (1 - firstGroupShare), placedBoxes);
    }
    return placedBoxes;
  }

  function createBoxElement(box, host) {
    const boxElement = createElement(
      box.href ? 'a' : 'button',
      box.href ? { href: box.href } : { type: 'button' },
      createElement('span', { class: 'tm-name' }),
      createElement('span', { class: 'tm-amt' })
    );
    if (!box.href) {
      boxElement.addEventListener('click', () => {
        const { onSelect } = host.treemapState.options;
        if (onSelect) onSelect(boxElement.dataset.id);
      });
    }
    return boxElement;
  }

  function updateBoxElement(boxElement, box, hostWidth, hostHeight, options) {
    const labelText = String(box.label ?? '');
    const amountText = String(box.text ?? '');
    const estimatedLabelLines = Math.ceil(
      (labelText.length * AVERAGE_CHARACTER_WIDTH) / Math.max(1, box.width - LABEL_HORIZONTAL_PADDING)
    );
    const isSmall = box.width < SMALL_BOX_MINIMUM_WIDTH || box.height < 31 + estimatedLabelLines * LABEL_LINE_HEIGHT;
    const isTiny = box.width < TINY_BOX_MINIMUM_SIZE || box.height < TINY_BOX_MINIMUM_SIZE;
    const boxColour = box.colour || options.defaultColour || DEFAULT_BOX_COLOUR;
    const isSelected = options.selectedId === box.id;

    boxElement.dataset.id = box.id;
    boxElement.className = [
      'tm-box',
      isSmall && 'tm-small',
      isTiny && 'tm-tiny',
      box.kind && 'tm-' + box.kind,
      box.hatched && 'is-hatched',
      box.kind !== 'unalloc' && isColourDark(boxColour) && 'on-dark',
      isSelected && 'tm-selected'
    ]
      .filter(Boolean)
      .join(' ');

    boxElement.style.setProperty('--c', boxColour);
    boxElement.style.left = (box.left / hostWidth) * 100 + '%';
    boxElement.style.top = (box.top / hostHeight) * 100 + '%';
    boxElement.style.width = (box.width / hostWidth) * 100 + '%';
    boxElement.style.height = (box.height / hostHeight) * 100 + '%';
    boxElement.children[0].textContent = labelText;
    boxElement.children[1].textContent = amountText;
    boxElement.setAttribute('aria-label', labelText + ', ' + amountText);

    if (box.tooltip) boxElement.dataset.tip = box.tooltip;
    else delete boxElement.dataset.tip;
    boxElement.title = isSmall && !box.tooltip ? labelText + ' ' + amountText : '';

    if (options.selectedId !== undefined && box.kind !== 'unalloc' && !box.href) {
      boxElement.setAttribute('aria-pressed', String(isSelected));
    } else boxElement.removeAttribute('aria-pressed');

    if (isTiny) {
      boxElement.tabIndex = -1;
      boxElement.setAttribute('aria-hidden', 'true');
    } else {
      boxElement.removeAttribute('tabindex');
      boxElement.removeAttribute('aria-hidden');
    }
    // return isSmall && box.kind !== 'unalloc'; // only boxes judged too small for a label get through
    return box.kind !== 'unalloc'; // return all boxes
  }

function renderSmallBoxKey(host, keyedBoxes) {
  const keyElement = document.querySelector('[data-small-key="' + host.id + '"]');
  if (!keyElement) return;
  keyElement.textContent = '';
  keyElement.hidden = keyedBoxes.length === 0;

  const boxesByGroupLabel = new Map();
  keyedBoxes.forEach(box => {
    const groupLabel = box.groupLabel || '';
    if (!boxesByGroupLabel.has(groupLabel)) boxesByGroupLabel.set(groupLabel, []);
    boxesByGroupLabel.get(groupLabel).push(box);
  });

  boxesByGroupLabel.forEach((groupBoxes, groupLabel) => {
    const groupElement = createElement('div', {
      class: 'key-card',
      style: { '--c': groupBoxes[0].colour || DEFAULT_BOX_COLOUR }
    });
    if (groupLabel) groupElement.append(createElement('div', { class: 'key-card-head', text: groupLabel }));
    groupBoxes.forEach(box =>
      groupElement.append(
        createElement(
          'span',
          { class: 'small-key-item' },
          createElement('span', {
            class: 'key' + (box.hatched ? ' is-hatched' : ''),
            'aria-hidden': 'true',
            style: { '--c': box.colour || DEFAULT_BOX_COLOUR }
          }),
          box.href ? createElement('a', { href: box.href, text: box.label }) : box.label,
          createElement('span', { class: 'key-card-amount', text: box.text })
        )
      )
    );
    keyElement.append(groupElement);
  });
}

  function renderTreemap(host, items, options = {}) {
    host.treemapState = { items, options };
    resizeObserver.observe(host);

    const hostWidth = host.clientWidth;
    const hostHeight = host.clientHeight;
    if (!hostWidth || !hostHeight) return;

    const placedBoxes = calculateLayout(items.filter(item => item.value > 0), 0, 0, hostWidth, hostHeight);
    host.placedBoxes = placedBoxes;

    const boxElementsById = host.boxElementsById || (host.boxElementsById = new Map());
    const smallBoxes = [];
    const visibleIds = new Set();

    placedBoxes.forEach(box => {
      let boxElement = boxElementsById.get(box.id);
      const requiredTagName = box.href ? 'A' : 'BUTTON';
      if (boxElement && boxElement.tagName !== requiredTagName) {
        boxElement.remove();
        boxElement = null;
      }
      if (!boxElement) {
        boxElement = createBoxElement(box, host);
        boxElementsById.set(box.id, boxElement);
        host.append(boxElement);
      }
      visibleIds.add(box.id);
      if (updateBoxElement(boxElement, box, hostWidth, hostHeight, options)) smallBoxes.push(box);
    });

    boxElementsById.forEach((boxElement, boxId) => {
      if (visibleIds.has(boxId)) return;
      boxElement.remove();
      boxElementsById.delete(boxId);
    });

    const orderedElements = placedBoxes.map(box => boxElementsById.get(box.id));
    const currentElements = [...host.querySelectorAll(':scope > .tm-box')];
    if (orderedElements.some((boxElement, position) => currentElements[position] !== boxElement)) {
      const firstHandle = host.querySelector('.tm-handle');
      orderedElements.forEach(boxElement => host.insertBefore(boxElement, firstHandle));
    }

    renderSmallBoxKey(host, smallBoxes);
    if (options.afterRender) options.afterRender(host, placedBoxes);
  }

  const resizeObserver = new ResizeObserver(entries =>
    entries.forEach(({ target }) => {
      if (target.treemapState) renderTreemap(target, target.treemapState.items, target.treemapState.options);
    })
  );

  return { calculateLayout, renderTreemap, isColourDark, resolveColourToRgb };
})();