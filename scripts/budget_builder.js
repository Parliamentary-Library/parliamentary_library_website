/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      budget_builder.js
Purpose:     Main page functionality for the "your budget" page in the youth budget
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/
'use strict';
window.BudgetBuilder = (() => {
  const budgetData = window.youthBudgetMetadata;
  const currentYear = budgetData.currentYear;
  const { getSpendingItems, sharePercentages, calculatePerPersonAmount } = window.BudgetCalculations;
  const { selectOne, selectAll, createElement, resolveColour, isDarkColour, formatBillions, formatBillionsLong, formatMillions, formatDollars,
    formatSigned, formatBillionsChange, formatPercentChange, roundToStep, formatUnitText, parseNumberInput, getSpendingGroupColour,
    isHatchedGroup, isMotionAllowed, getSelectedRadioValue, addListeners, sumValues, createTreemapItem } = window.UtilityHelpers;
  const { renderTreemap, calculateLayout } = window.TreeMapCreator;
  const { createColourKey } = window.ChartTools;
  const { openPopup, closePopup, createParagraph, createPopupButton, createFactList, openSpendingAreaPopup } = window.PopupText;

  const BUDGET_STEP = 100;
  const KEYBOARD_LARGE_STEP = 1000;
  const DRAG_SENSITIVITY = 0.6;
  let hasSeenBuildIntro = false;

  const HOW_BUILD_POPUP = {
      kicker: 'Make your own Budget',
      title: 'How this works',
      body: [
        createElement('ol', { class: 'pop-steps' }, [
          ['Choose a total.', "Start with the Government's plan, only spend what comes in, or pick your own amount."],
          ['Share it out.', 'Tap an area, then drag its black handle or use - and +. Your total stays the same, so making one area bigger takes a little from all the others, and making one smaller shares the money back out.'],
          ['Review and share.', "See how your Budget compares with the Government's, then share it with your friends."]
        ].map(([heading, text]) => createElement('li', {}, createElement('b', { text: heading + ' ' }), text))),
        createParagraph("There’s no right answer. Real Budgets are about choices between things people care about, now and in the future.", 'small')
      ],
      actions: [createPopupButton('Start', closePopup, true)]
    };

  let budgetAreas = [];
  let governmentAllocations = {};
  let governmentTotal = 0;
  let governmentRevenue = 0;
  let governmentShares = {};
  const budgetEditorState = { mode: 'gov', totalAmount: 0, allocations: {}, selectedAreaId: null, isSharedBudget: false };

  function loadBudgetBaseline() {
    budgetAreas = getSpendingItems(currentYear);
    governmentAllocations = Object.fromEntries(budgetAreas.map(area => [area.id, area.selectedYearValue]));
    governmentTotal = budgetData.years[currentYear].spending;
    governmentRevenue = budgetData.years[currentYear].revenue;
    const governmentShareValues = sharePercentages(budgetAreas.map(area => governmentAllocations[area.id]));
    governmentShares = Object.fromEntries(budgetAreas.map((area, index) => [area.id, governmentShareValues[index]]));
    Object.assign(budgetEditorState, { totalAmount: governmentTotal, allocations: { ...governmentAllocations } });
  }

  const getAllocatedTotal = () => sumValues(Object.values(budgetEditorState.allocations));
  const findAreaById = areaId => budgetAreas.find(area => area.id === areaId);
  const showEditorMessage = message => (selectOne('#ed-msg').textContent = message || '');

  function getUnallocatedAmount() {
    const unallocatedAmount = budgetEditorState.totalAmount - getAllocatedTotal();
    return Math.abs(unallocatedAmount) < 1 ? 0 : unallocatedAmount;
  }

  function getBorrowingSummary() {
    const borrowing = getAllocatedTotal() - governmentRevenue;
    return { borrowing, label: borrowing > 50 ? "You'd borrow" : borrowing < -50 ? 'Surplus' : 'Borrowing', amountText: Math.abs(borrowing) > 50 ? formatBillions(Math.abs(borrowing)) : 'None' };
  }

  function moveAmountToArea(areaId, targetAmount, baseAllocations = budgetEditorState.allocations) {
    const newAllocations = { ...baseAllocations };
    const otherAreas = budgetAreas.filter(area => area.id !== areaId);
    const otherAreasTotal = sumValues(otherAreas.map(area => newAllocations[area.id]));
    let movedAmount = Math.max(0, targetAmount) - newAllocations[areaId];
    if (movedAmount > 0) movedAmount = Math.min(movedAmount, otherAreasTotal);
    if (Math.abs(movedAmount) < 0.5) return '';
    otherAreas.forEach(area => {
      const shareOfOtherAreas = otherAreasTotal > 0 ? newAllocations[area.id] / otherAreasTotal : 1 / otherAreas.length;
      newAllocations[area.id] = Math.max(0, newAllocations[area.id] - movedAmount * shareOfOtherAreas);
    });
    newAllocations[areaId] += movedAmount;
    budgetEditorState.allocations = newAllocations;
    return movedAmount > 0 ? formatMillions(movedAmount) + ' was taken from the other areas, a little from each.' : formatMillions(-movedAmount) + ' was shared out across the other areas.';
  }

  function stepAreaAmount(areaId, direction) {
    if (!areaId) return;
    if (direction < 0 && budgetEditorState.allocations[areaId] <= 0) return showEditorMessage('This area is already at $0.');
    const message = moveAmountToArea(areaId, budgetEditorState.allocations[areaId] + direction * BUDGET_STEP);
    budgetEditorState.selectedAreaId = areaId;
    renderBuild();
    showEditorMessage(message);
  }

  function setBudgetTotal(newTotal) {
    const previousAllocatedTotal = getAllocatedTotal();
    let message = '';
    budgetEditorState.totalAmount = newTotal;
    if (Math.abs(newTotal - previousAllocatedTotal) > 1 && previousAllocatedTotal > 0) {
      const scaleFactor = newTotal / previousAllocatedTotal;
      Object.keys(budgetEditorState.allocations).forEach(areaId => (budgetEditorState.allocations[areaId] *= scaleFactor));
      message = 'Every area has been made ' + Math.round(Math.abs(1 - scaleFactor) * 1000) / 10 + '% ' + (scaleFactor < 1 ? 'smaller' : 'bigger') + ' so it fits your new total. Now move money between areas to match what matters to you.';
    }
    selectOne('#total-msg').textContent = message;
    renderBuild();
  }

  function keepSelectedAreaVisible() {
    if (window.innerWidth >= 900 || !budgetEditorState.selectedAreaId) return;
    requestAnimationFrame(() => {
      const selectedBoxElement = selectOne('#build-tree').querySelector('.tm-box[data-id="' + budgetEditorState.selectedAreaId + '"]');
      if (!selectedBoxElement) return;
      const overlap = selectedBoxElement.getBoundingClientRect().bottom + 24 - selectOne('#editor').getBoundingClientRect().top;
      if (overlap > 0) window.scrollBy({ top: Math.min(overlap, selectOne('#build-tree').getBoundingClientRect().top - 8), behavior: isMotionAllowed() ? 'smooth' : 'auto' });
    });
  }

  function selectArea(areaId, shouldScrollToEditor = false) {
    budgetEditorState.selectedAreaId = areaId;
    showEditorMessage('');
    renderBuild();
    if (shouldScrollToEditor) selectOne('#editor').scrollIntoView({ block: 'nearest' });
    else keepSelectedAreaVisible();
  }

  function getAllocationShares() {
    const areaIds = budgetAreas.map(area => area.id);
    const shareValues = sharePercentages(areaIds.map(areaId => budgetEditorState.allocations[areaId]).concat(Math.max(0, getUnallocatedAmount())));
    return Object.fromEntries([...areaIds, '_left'].map((shareKey, index) => [shareKey, shareValues[index]]));
  }

  const formatAllocationAmount = (amount, areaId, shares) => formatUnitText(getSelectedRadioValue('b-unit'), amount, shares[areaId]);

  function formatAllocationChange(areaId, shares) {
    const unit = getSelectedRadioValue('b-unit');
    const amountDifference = budgetEditorState.allocations[areaId] - governmentAllocations[areaId];
    if (unit === 'hundred') {
      const shareDifference = shares[areaId] - governmentShares[areaId];
      return shareDifference === 0 ? 'no change' : formatSigned('$' + Math.abs(shareDifference), shareDifference);
    }
    if (Math.abs(amountDifference) < 50) return 'no change';
    if (unit === 'person') return formatSigned(formatDollars(Math.abs(roundToStep(calculatePerPersonAmount(amountDifference), 10))), amountDifference);
    return formatBillionsChange(amountDifference);
  }

  function bindHoldToRepeat(buttonElement, repeatAction) {
    let repeatTimerId = null;
    let hasPointerFired = false;
    const stopRepeating = () => {
      clearTimeout(repeatTimerId);
      repeatTimerId = null;
    };
    buttonElement.addEventListener('pointerdown', event => {
      if (event.button !== 0 || buttonElement.disabled) return;
      hasPointerFired = true;
      repeatAction();
      let delayMilliseconds = 420;
      const repeat = () => {
        repeatAction();
        delayMilliseconds = Math.max(45, delayMilliseconds * 0.8);
        repeatTimerId = setTimeout(repeat, delayMilliseconds);
      };
      repeatTimerId = setTimeout(repeat, delayMilliseconds);
    });
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(eventName => buttonElement.addEventListener(eventName, stopRepeating));
    buttonElement.addEventListener('click', () => (hasPointerFired ? (hasPointerFired = false) : repeatAction()));
    buttonElement.addEventListener('contextmenu', event => event.preventDefault());
  }

  function renderAreaList() {
    selectOne('#build-list').replaceChildren(...budgetAreas.map(area => {
      const createStepButton = (symbol, labelPrefix, direction) => {
        const stepButton = createElement('button', { type: 'button', class: 'btn-pm', 'aria-label': labelPrefix + area.label, text: symbol });
        bindHoldToRepeat(stepButton, () => stepAreaAmount(area.id, direction));
        return stepButton;
      };
      const nameButton = createElement('button', { type: 'button', class: 'area-name', 'aria-pressed': 'false', onclick: () => selectArea(area.id, window.innerWidth < 900) }, createColourKey(getSpendingGroupColour(area.group), isHatchedGroup(area.group)), area.label);
      return createElement('li', { class: 'area-row', 'data-id': area.id, style: { '--c': getSpendingGroupColour(area.group) } }, nameButton,
        createElement('span', { class: 'area-val' }, createElement('b'), createElement('span')),
        createElement('span', { class: 'area-btns' }, createStepButton('-', 'Less for ', -1), createStepButton('+', 'More for ', 1)));
    }));
  }

  let dragState = null;

  function createResizeHandles(treemapHost) {
    if (treemapHost.resizeHandles) return;
    const createHandle = (edgeName, label) => {
      const handleElement = createElement('div', { class: 'tm-handle h-' + edgeName, 'data-edge': edgeName });
      if (label) Object.entries({ role: 'slider', tabindex: '0', 'aria-label': label, 'aria-valuemin': '0' }).forEach(([name, value]) => handleElement.setAttribute(name, value));
      else handleElement.setAttribute('aria-hidden', 'true');
      handleElement.addEventListener('pointerdown', event => startHandleDrag(event, treemapHost, handleElement));
      treemapHost.append(handleElement);
      return handleElement;
    };
    treemapHost.resizeHandles = { right: createHandle('right'), bottom: createHandle('bottom'), corner: createHandle('corner', 'Resize selected area') };
    const keyboardSteps = { ArrowUp: BUDGET_STEP, ArrowRight: BUDGET_STEP, ArrowDown: -BUDGET_STEP, ArrowLeft: -BUDGET_STEP, PageUp: KEYBOARD_LARGE_STEP, PageDown: -KEYBOARD_LARGE_STEP };
    treemapHost.resizeHandles.corner.addEventListener('keydown', event => {
      const { selectedAreaId, allocations } = budgetEditorState;
      if (!(event.key in keyboardSteps) || !selectedAreaId) return;
      event.preventDefault();
      const message = moveAmountToArea(selectedAreaId, allocations[selectedAreaId] + keyboardSteps[event.key]);
      renderBuild();
      showEditorMessage(message);
    });
  }

  function positionResizeHandles(treemapHost, selectedBox) {
    const handles = treemapHost.resizeHandles;
    if (!handles) return;
    Object.values(handles).forEach(handleElement => (handleElement.hidden = !selectedBox));
    if (!selectedBox) return;
    const hostWidth = treemapHost.clientWidth;
    const hostHeight = treemapHost.clientHeight;
    const rightEdge = selectedBox.left + selectedBox.width;
    const bottomEdge = selectedBox.top + selectedBox.height;
    const toPercent = (value, total) => (value / total) * 100 + '%';
    Object.assign(handles.right.style, { left: toPercent(Math.min(rightEdge, hostWidth - 9), hostWidth), top: toPercent(selectedBox.top + selectedBox.height / 2, hostHeight) });
    Object.assign(handles.bottom.style, { left: toPercent(selectedBox.left + selectedBox.width / 2, hostWidth), top: toPercent(Math.min(bottomEdge, hostHeight - 9), hostHeight) });
    Object.assign(handles.corner.style, { left: toPercent(Math.min(rightEdge, hostWidth - 15), hostWidth), top: toPercent(Math.min(bottomEdge, hostHeight - 15), hostHeight) });
    const selectedAmount = budgetEditorState.allocations[budgetEditorState.selectedAreaId];
    handles.corner.setAttribute('aria-label', 'Resize ' + findAreaById(budgetEditorState.selectedAreaId).label);
    handles.corner.setAttribute('aria-valuemax', String(Math.round(budgetEditorState.totalAmount)));
    handles.corner.setAttribute('aria-valuenow', String(Math.round(selectedAmount)));
    handles.corner.setAttribute('aria-valuetext', formatBillionsLong(selectedAmount));
  }

  function startHandleDrag(pointerEvent, treemapHost, handleElement) {
    const { selectedAreaId, totalAmount, allocations } = budgetEditorState;
    if (!selectedAreaId || pointerEvent.button !== 0) return;
    pointerEvent.preventDefault();
    const selectedBox = treemapHost.placedBoxes.find(box => box.id === selectedAreaId);
    if (!selectedBox) return;
    handleElement.setPointerCapture(pointerEvent.pointerId);
    dragState = {
      areaId: selectedAreaId,
      edge: handleElement.dataset.edge,
      startPointerX: pointerEvent.clientX,
      startPointerY: pointerEvent.clientY,
      startWidth: selectedBox.width,
      startHeight: selectedBox.height,
      amountPerPixel: totalAmount / (treemapHost.clientWidth * treemapHost.clientHeight),
      startAllocations: { ...allocations },
      startAmount: allocations[selectedAreaId],
      message: '',
      animationFrameId: 0,
      lastPointerEvent: pointerEvent
    };
    treemapHost.classList.add('dragging');
    const handlePointerMove = moveEvent => {
      dragState.lastPointerEvent = moveEvent;
      if (dragState.animationFrameId) return;
      dragState.animationFrameId = requestAnimationFrame(() => {
        dragState.animationFrameId = 0;
        const horizontalMovement = (dragState.lastPointerEvent.clientX - dragState.startPointerX) * dragState.startHeight;
        const verticalMovement = (dragState.lastPointerEvent.clientY - dragState.startPointerY) * dragState.startWidth;
        const areaChange = DRAG_SENSITIVITY * (dragState.edge === 'right' ? horizontalMovement : dragState.edge === 'bottom' ? verticalMovement : (horizontalMovement + verticalMovement) / 2);
        dragState.message = moveAmountToArea(dragState.areaId, roundToStep(dragState.startAmount + areaChange * dragState.amountPerPixel, BUDGET_STEP), dragState.startAllocations);
        renderBuild();
        showEditorMessage('');
      });
    };
    const handlePointerUp = () => {
      ['pointermove', 'pointerup', 'pointercancel'].forEach(eventName => handleElement.removeEventListener(eventName, eventName === 'pointermove' ? handlePointerMove : handlePointerUp));
      treemapHost.classList.remove('dragging');
      if (dragState.animationFrameId) cancelAnimationFrame(dragState.animationFrameId);
      const amountDifference = budgetEditorState.allocations[dragState.areaId] - dragState.startAmount;
      showEditorMessage(Math.abs(amountDifference) < 1 ? '' : findAreaById(dragState.areaId).label + ' ' + formatBillionsChange(amountDifference) + '. ' + dragState.message);
      dragState = null;
    };
    handleElement.addEventListener('pointermove', handlePointerMove);
    handleElement.addEventListener('pointerup', handlePointerUp);
    handleElement.addEventListener('pointercancel', handlePointerUp);
  }

  function renderBuildTreemap() {
    const shares = getAllocationShares();
    const { allocations, selectedAreaId } = budgetEditorState;
    const unallocatedAmount = getUnallocatedAmount();
    const treemapItems = budgetAreas.map(area => createTreemapItem(area, allocations[area.id], formatAllocationAmount(allocations[area.id], area.id, shares), getSpendingGroupColour(area.group)));
    if (unallocatedAmount >= 50) treemapItems.push({ id: '_left', label: 'Left over', value: unallocatedAmount, text: formatAllocationAmount(unallocatedAmount, '_left', shares), kind: 'unalloc' });
    const treemapHost = selectOne('#build-tree');
    createResizeHandles(treemapHost);
    renderTreemap(treemapHost, treemapItems, {
      selectedId: selectedAreaId,
      onSelect: areaId => (areaId === '_left' ? showEditorMessage("Money you haven't given to any area yet. Make an area bigger to use it.") : selectArea(areaId)),
      afterRender: (host, placedBoxes) => positionResizeHandles(host, placedBoxes.find(box => box.id === selectedAreaId))
    });
  }

  function renderBuildStatus() {
    const { label, amountText } = getBorrowingSummary();
    const createStatusItem = (itemLabel, valueText) => createElement('div', {}, createElement('span', { text: itemLabel }), createElement('b', { text: valueText }));
    selectOne('#build-status').replaceChildren(createStatusItem('Your total', formatBillions(budgetEditorState.totalAmount)), createStatusItem('Coming in', formatBillions(governmentRevenue)), createStatusItem(label, amountText));
  }

  function renderAreaRows() {
    const shares = getAllocationShares();
    budgetAreas.forEach(area => {
      const rowElement = selectOne('.area-row[data-id="' + area.id + '"]');
      const isSelected = budgetEditorState.selectedAreaId === area.id;
      rowElement.classList.toggle('is-selected', isSelected);
      selectOne('.area-name', rowElement).setAttribute('aria-pressed', String(isSelected));
      selectOne('.area-val b', rowElement).textContent = formatAllocationAmount(budgetEditorState.allocations[area.id], area.id, shares);
      selectOne('.area-val span', rowElement).textContent = formatAllocationChange(area.id, shares);
      selectAll('.btn-pm', rowElement)[0].disabled = budgetEditorState.allocations[area.id] <= 0;
    });
  }

  function renderEditor() {
    const selectedArea = budgetEditorState.selectedAreaId && findAreaById(budgetEditorState.selectedAreaId);
    const nameElement = selectOne('#ed-name');
    const valueInput = selectOne('#ed-value');
    selectOne('#editor').style.setProperty('--c', selectedArea ? getSpendingGroupColour(selectedArea.group) : 'var(--ink)');
    selectOne('#editor').classList.toggle('is-empty', !selectedArea);
    ['#ed-less', '#ed-more', '#ed-value', '#ed-about'].forEach(selector => (selectOne(selector).disabled = !selectedArea));
    if (!selectedArea) {
      nameElement.textContent = 'Select an area';
      selectOne('#ed-compare').textContent = 'Tap a box or a name to choose an area.';
      valueInput.value = '';
      return;
    }
    const selectedAmount = budgetEditorState.allocations[selectedArea.id];
    nameElement.replaceChildren(createColourKey(getSpendingGroupColour(selectedArea.group), isHatchedGroup(selectedArea.group)), selectedArea.label);
    selectOne('#ed-compare').replaceChildren(formatBillions(governmentAllocations[selectedArea.id]) + ' → ', createElement('b', { text: formatBillions(selectedAmount) }));
    if (document.activeElement !== valueInput) valueInput.value = (selectedAmount / 1000).toFixed(1);
  }

  function renderBuild() {
    renderBuildTreemap();
    renderBuildStatus();
    renderAreaRows();
    renderEditor();
  }

  function loadSharedBudget(shareCode) {
    const codeParts = String(shareCode).split('~').map(Number);
    if (codeParts[0] !== 2 || codeParts.length !== budgetAreas.length + 2 || codeParts.some(part => !Number.isFinite(part) || part < 0)) return false;
    const totalAmount = codeParts[1] * 10;
    if (totalAmount < 100000 || totalAmount > 400000) return false;
    const allocations = Object.fromEntries(budgetAreas.map((area, index) => [area.id, codeParts[index + 2] * 10]));
    const allocatedTotal = sumValues(Object.values(allocations));
    if (allocatedTotal > totalAmount + 100) return false;
    if (allocatedTotal > 0 && Math.abs(allocatedTotal - totalAmount) > 1) Object.keys(allocations).forEach(areaId => (allocations[areaId] *= totalAmount / allocatedTotal));
    const mode = Math.abs(totalAmount - governmentTotal) < 20 ? 'gov' : Math.abs(totalAmount - governmentRevenue) < 20 ? 'rev' : 'custom';
    Object.assign(budgetEditorState, { totalAmount, allocations, isSharedBudget: true, selectedAreaId: null, mode });
    return true;
  }

  const createShareCode = () => ['2', Math.round(budgetEditorState.totalAmount / 10), ...budgetAreas.map(area => Math.round(budgetEditorState.allocations[area.id] / 10))].join('~');
  const createShareUrl = () => location.href.split('#')[0] + '#/build?s=' + createShareCode();

  function syncTotalControls() {
    selectAll('input[name=total]').forEach(radio => (radio.checked = radio.value === budgetEditorState.mode));
    selectOne('#custom-wrap').hidden = budgetEditorState.mode !== 'custom';
    if (budgetEditorState.mode === 'custom') selectOne('#custom-total').value = (budgetEditorState.totalAmount / 1000).toFixed(1);
    selectOne('#shared-banner').hidden = !budgetEditorState.isSharedBudget;
  }

  function resetBuild() {
    Object.assign(budgetEditorState, { mode: 'gov', totalAmount: governmentTotal, allocations: { ...governmentAllocations }, selectedAreaId: null, isSharedBudget: false });
    selectOne('#total-msg').textContent = '';
    showEditorMessage('');
    syncTotalControls();
    renderBuild();
  }

  function getChangesFromGovernment() {
    return budgetAreas.map(area => ({ area, difference: budgetEditorState.allocations[area.id] - governmentAllocations[area.id] }))
      .filter(change => Math.abs(change.difference) >= 50)
      .sort((first, second) => Math.abs(second.difference) - Math.abs(first.difference));
  }

  const formatChangeWithPercent = ({ area, difference }) => formatBillionsChange(difference) + ' (' + formatPercentChange((difference / governmentAllocations[area.id]) * 100) + ')';

  function createChangeList(title, changes) {
    if (!changes.length) return [];
    return [createElement('h3', { text: title }), createElement('ul', { class: 'change-list' }, changes.map(change => createElement('li', {},
      createElement('span', {}, createColourKey(getSpendingGroupColour(change.area.group), isHatchedGroup(change.area.group)), change.area.label),
      createElement('span', { text: formatChangeWithPercent(change) }))))];
  }

  function openReviewPopup() {
    const { borrowing, label, amountText } = getBorrowingSummary();
    const unallocatedAmount = getUnallocatedAmount();
    const changes = getChangesFromGovernment();
    const governmentBorrowing = governmentTotal - governmentRevenue;
    const comparisonText = borrowing < governmentBorrowing - 50 ? ', less than the Government.' : borrowing > governmentBorrowing + 50 ? ', more than the Government.' : ', the same as the Government.';
    const borrowingLine = borrowing > 50 ? "You'd borrow about " + formatBillionsLong(borrowing) + comparisonText : borrowing < -50 ? "You'd have a surplus of " + formatBillionsLong(-borrowing) + '.' : "You wouldn't need to borrow anything.";
    const shareUrlInput = createElement('input', { type: 'text', readonly: true, value: createShareUrl(), id: 'share-url' });
    const messageElement = createElement('p', { class: 'msg', role: 'status' });
    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(createShareUrl());
        messageElement.textContent = 'Link copied.';
      } catch {
        shareUrlInput.focus();
        shareUrlInput.select();
        messageElement.textContent = "Couldn't copy automatically. The link is selected, copy it from the box.";
      }
    };
    const shareLink = async () => {
      try {
        await navigator.share({ title: 'My Budget', text: "Here's how I'd share out New Zealand's Budget.", url: createShareUrl() });
      } catch (error) {
        if (error.name !== 'AbortError') messageElement.textContent = "Sharing didn't work. Try copying the link.";
      }
    };
    openPopup({
      kicker: 'Make your own Budget',
      title: 'Your Budget',
      body: [
        createFactList([['Your total', formatBillions(budgetEditorState.totalAmount)], ['Government', formatBillions(governmentTotal)], [label, amountText]]),
        borrowingLine,
        unallocatedAmount >= 50 && formatBillionsLong(unallocatedAmount) + ' left over (not spent).',
        !changes.length && "You've shared the money out the same way as the Government.",
        Math.abs(budgetEditorState.totalAmount - governmentTotal) >= 50 && changes.length > 0 && createParagraph('These changes include making every area bigger or smaller to fit your total.', 'small'),
        createChangeList('More for', changes.filter(change => change.difference > 0)),
        createChangeList('Less for', changes.filter(change => change.difference < 0)),
        createElement('label', { class: 'share-url' }, 'Link to share with friends', shareUrlInput),
        messageElement
      ],
      actions: [navigator.share && createPopupButton('Share with friends', shareLink, true), createPopupButton('Copy link', copyLink, !navigator.share), createPopupButton('Download image', () => downloadBudgetImage(messageElement))]
    });
  }

  function wrapText(context, text, maximumWidth) {
    const lines = [];
    let currentLine = '';
    text.split(' ').forEach(word => {
      const extendedLine = currentLine ? currentLine + ' ' + word : word;
      if (context.measureText(extendedLine).width > maximumWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else currentLine = extendedLine;
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  function downloadBudgetImage(messageElement) {
    const canvasWidth = 1080;
    const canvasHeight = 1350;
    const padding = 60;
    const treemapTop = padding + 120;
    const treemapHeight = 740;
    const fontFamily = '"Open Sans", Arial, sans-serif';
    const canvas = Object.assign(document.createElement('canvas'), { width: canvasWidth, height: canvasHeight });
    const context = canvas.getContext('2d');
    const { borrowing } = getBorrowingSummary();
    const borrowingText = borrowing > 50 ? 'borrowing ' + formatBillions(borrowing) : borrowing < -50 ? 'surplus ' + formatBillions(-borrowing) : 'no borrowing';
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = '#111';
    context.textBaseline = 'top';
    context.font = 'bold 40px ' + fontFamily;
    context.fillText('My Budget 2026/27', padding, padding);
    context.font = '28px ' + fontFamily;
    context.fillText('Total ' + formatBillions(budgetEditorState.totalAmount) + '  ·  ' + borrowingText, padding, padding + 56);

    const areaBoxes = budgetAreas.map(area => ({ id: area.id, label: area.label, value: budgetEditorState.allocations[area.id], group: area.group }));
    if (getUnallocatedAmount() >= 50) areaBoxes.push({ id: '_left', label: 'Left over', value: getUnallocatedAmount(), group: null });
    calculateLayout(areaBoxes.filter(box => box.value > 0), padding, treemapTop, canvasWidth - padding * 2, treemapHeight).forEach(box => {
      const fillColour = box.group ? 'var(--g-' + box.group + ')' : 'var(--grey-light)';
      context.fillStyle = resolveColour(fillColour);
      context.fillRect(box.left, box.top, box.width, box.height);
      context.strokeStyle = '#fff';
      context.lineWidth = 3;
      context.strokeRect(box.left, box.top, box.width, box.height);
      context.save();
      context.beginPath();
      context.rect(box.left + 8, box.top + 12, box.width - 16, box.height - 20);
      context.clip();
      context.fillStyle = isDarkColour(fillColour) ? '#ffffff' : '#0d0d0d';
      context.font = 'bold 22px ' + fontFamily;
      const labelLines = wrapText(context, box.label, box.width - 24);
      labelLines.forEach((line, lineIndex) => context.fillText(line, box.left + 12, box.top + 16 + lineIndex * 26));
      context.font = '20px ' + fontFamily;
      context.fillText(formatBillions(box.value), box.left + 12, box.top + 18 + labelLines.length * 26);
      context.restore();
    });
    context.strokeStyle = '#111';
    context.lineWidth = 3;
    context.strokeRect(padding, treemapTop, canvasWidth - padding * 2, treemapHeight);

    let textTop = treemapTop + treemapHeight + 40;
    context.fillStyle = '#111';
    context.font = 'bold 26px ' + fontFamily;
    context.fillText("Biggest changes from the Government's plan", padding, textTop);
    textTop += 44;
    context.font = '24px ' + fontFamily;
    const biggestChanges = getChangesFromGovernment().slice(0, 5);
    if (!biggestChanges.length) context.fillText("None. It's shared out the same way as the Government's.", padding, textTop);
    biggestChanges.forEach(change => {
      context.fillText(change.area.label, padding, textTop);
      context.textAlign = 'right';
      context.fillText(formatChangeWithPercent(change), canvasWidth - padding, textTop);
      context.textAlign = 'left';
      textTop += 38;
    });
    context.font = '20px ' + fontFamily;
    context.fillText('Made with the Parliamentary Library Budget explorer (prototype)', padding, canvasHeight - padding - 20);
    canvas.toBlob(blob => {
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = createElement('a', { href: downloadUrl, download: 'my-budget-2026-27.png' });
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
      messageElement.textContent = 'Image downloaded.';
    });
  }

  const clearBuildAddress = () => history.replaceState(null, '', location.pathname + location.search + '#/build');

  function routeToBuildPage(queryParams) {
    if (queryParams.s && loadSharedBudget(queryParams.s)) {
      syncTotalControls();
      clearBuildAddress();
      hasSeenBuildIntro = true;
    }
    if (queryParams.focus && findAreaById(queryParams.focus)) {
      budgetEditorState.selectedAreaId = queryParams.focus;
      clearBuildAddress();
    }
    renderBuild();
    if (queryParams.focus) selectOne('#editor').scrollIntoView({ block: 'center' });
    if (!hasSeenBuildIntro) {
      hasSeenBuildIntro = true;
      setTimeout(() => openPopup(HOW_BUILD_POPUP), 150);
    }
  }

  function init() {
    loadBudgetBaseline();
    selectOne('#how-build').addEventListener('click', () => openPopup(HOW_BUILD_POPUP));
    window.addEventListener('pointerup', () => selectAll('.btn-pm, .btn-step').forEach(button => button.dispatchEvent(new Event('pointercancel'))));
    const applyCustomTotal = () => {
      const enteredBillions = parseNumberInput(selectOne('#custom-total').value);
      if (enteredBillions === null || Number.isNaN(enteredBillions) || enteredBillions < 100 || enteredBillions > 400) return (selectOne('#total-msg').textContent = 'Enter a total between 100 and 400 (billion dollars).');
      setBudgetTotal(enteredBillions * 1000);
    };
    addListeners('input[name=total]', 'change', event => {
      const radio = event.target;
      if (!radio.checked) return;
      budgetEditorState.mode = radio.value;
      selectOne('#custom-wrap').hidden = radio.value !== 'custom';
      if (radio.value === 'gov') setBudgetTotal(governmentTotal);
      if (radio.value === 'rev') setBudgetTotal(governmentRevenue);
      if (radio.value === 'custom') {
        selectOne('#custom-total').value = (budgetEditorState.totalAmount / 1000).toFixed(1);
        selectOne('#total-msg').textContent = 'Type in a total, then press "Use this total".';
      }
    });
    selectOne('#apply-total').addEventListener('click', applyCustomTotal);
    selectOne('#custom-total').addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      applyCustomTotal();
    });
    addListeners('input[name="b-unit"]', 'change', renderBuild);
    renderAreaList();
    bindHoldToRepeat(selectOne('#ed-less'), () => stepAreaAmount(budgetEditorState.selectedAreaId, -1));
    bindHoldToRepeat(selectOne('#ed-more'), () => stepAreaAmount(budgetEditorState.selectedAreaId, 1));
    selectOne('#ed-value').addEventListener('change', event => {
      const enteredBillions = parseNumberInput(event.target.value);
      if (enteredBillions === null || Number.isNaN(enteredBillions) || enteredBillions < 0) {
        showEditorMessage('Enter an amount in billions, like 12.5.');
        return renderBuild();
      }
      const message = moveAmountToArea(budgetEditorState.selectedAreaId, enteredBillions * 1000);
      renderBuild();
      showEditorMessage(message);
    });
    selectOne('#ed-about').addEventListener('click', () => budgetEditorState.selectedAreaId && openSpendingAreaPopup(budgetEditorState.selectedAreaId));
    selectOne('#review-btn').addEventListener('click', openReviewPopup);
    selectOne('#reset-btn').addEventListener('click', () => openPopup({
      kicker: 'Make your own Budget',
      title: 'Start again?',
      body: ["Every area goes back to the Government's plan."],
      actions: [createPopupButton('Start again', () => { closePopup(); resetBuild(); }, true), createPopupButton('Keep my changes', closePopup)]
    }));
    selectOne('#start-own').addEventListener('click', resetBuild);
  }

  return { init, routeToBuildPage };
})();