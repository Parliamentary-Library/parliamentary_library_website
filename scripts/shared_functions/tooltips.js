/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      tooltips.js
Purpose:     Provides functions for handling tooltips.
------------------------------------------------------------------------------
Options: 
    contentAttribute, Attribute the text is read from, default = 'data-tip'
    variantAttribute, Attribute the variant is read from, default = 'data-tip-variant'
    triggerSelector, Which elements trigger a tooltip, default = '[data-tip]'
    getContent(triggerElement), Function to get the content for a tooltip, default = null
    placement, Where the tooltip is placed relative to the trigger, default = 'top', other options = 'bottom', 'left', 'right', 'auto'
    offsetPixels, How many pixels between the trigger and the tooltip, default = 8
    viewportMarginPixels, How many pixels between the tooltip and the edge of the viewport, default = 8
    showDelayMilliseconds, How long to wait before showing a tooltip, default = 0
    hideDelayMilliseconds, How long to wait before hiding a tooltip, default = 0
    followPointer, Whether the tooltip follows the pointer when it moves over the trigger, default = false
    hideOnScroll, Whether to hide the tooltip when the page is scrolled, default = true
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/

'use strict';
window.TooltipTools = (() => {
  const { createElement } = window.UtilityHelpers;

  const DEFAULT_OPTIONS = {
    tooltipId: 'tooltip',
    contentAttribute: 'data-tip',
    variantAttribute: 'data-tip-variant',
    triggerSelector: null,
    getContent: null,
    placement: 'top',
    offsetPixels: 8,
    viewportMarginPixels: 8,
    showDelayMilliseconds: 0,
    hideDelayMilliseconds: 0,
    followPointer: false,
    hideOnScroll: true
  };

  const OPPOSITE_PLACEMENT = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
  const AUTO_PLACEMENT_ORDER = ['top', 'bottom', 'right', 'left'];

  function calculatePosition(anchorRectangle, tooltipSize, placement, offsetPixels, viewportMarginPixels) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const horizontalCentre = anchorRectangle.left + anchorRectangle.width / 2 - tooltipSize.width / 2;
    const verticalCentre = anchorRectangle.top + anchorRectangle.height / 2 - tooltipSize.height / 2;

    const positionByPlacement = {
      top: { left: horizontalCentre, top: anchorRectangle.top - tooltipSize.height - offsetPixels },
      bottom: { left: horizontalCentre, top: anchorRectangle.bottom + offsetPixels },
      left: { left: anchorRectangle.left - tooltipSize.width - offsetPixels, top: verticalCentre },
      right: { left: anchorRectangle.right + offsetPixels, top: verticalCentre }
    };

    const fitsInViewport = position =>
      position.left >= viewportMarginPixels &&
      position.top >= viewportMarginPixels &&
      position.left + tooltipSize.width <= viewportWidth - viewportMarginPixels &&
      position.top + tooltipSize.height <= viewportHeight - viewportMarginPixels;

    const placementOrder =
      placement === 'auto' ? AUTO_PLACEMENT_ORDER : [placement, OPPOSITE_PLACEMENT[placement]];
    const chosenPlacement =
      placementOrder.find(candidate => fitsInViewport(positionByPlacement[candidate])) || placementOrder[0];
    const chosenPosition = positionByPlacement[chosenPlacement];

    return {
      left: Math.max(viewportMarginPixels, Math.min(viewportWidth - tooltipSize.width - viewportMarginPixels, chosenPosition.left)),
      top: Math.max(viewportMarginPixels, Math.min(viewportHeight - tooltipSize.height - viewportMarginPixels, chosenPosition.top)),
      placement: chosenPlacement
    };
  }

  function createTooltip(userOptions = {}) {
    const options = { ...DEFAULT_OPTIONS, ...userOptions };
    const triggerSelector = options.triggerSelector || '[' + options.contentAttribute + ']';
    const tooltipElement =
      document.getElementById(options.tooltipId) ||
      document.body.appendChild(createElement('div', { id: options.tooltipId, class: 'tooltip', hidden: true }));
    tooltipElement.setAttribute('role', 'tooltip');
    tooltipElement.style.position = 'absolute';

    let activeTriggerElement = null;
    let showTimerId = null;
    let hideTimerId = null;

    const readContent = triggerElement =>
      options.getContent ? options.getContent(triggerElement) : triggerElement.getAttribute(options.contentAttribute);

    function placeTooltip(anchorRectangle) {
      const tooltipSize = { width: tooltipElement.offsetWidth, height: tooltipElement.offsetHeight };
      const position = calculatePosition(
        anchorRectangle,
        tooltipSize,
        options.placement,
        options.offsetPixels,
        options.viewportMarginPixels
      );
      tooltipElement.style.left = position.left + window.scrollX + 'px';
      tooltipElement.style.top = position.top + window.scrollY + 'px';
      tooltipElement.dataset.placement = position.placement;
    }

    function pointerRectangle(pointerEvent) {
      return {
        left: pointerEvent.clientX,
        right: pointerEvent.clientX,
        top: pointerEvent.clientY,
        bottom: pointerEvent.clientY,
        width: 0,
        height: 0
      };
    }

    function show(triggerElement, pointerEvent) {
      const content = readContent(triggerElement);
      if (content == null || content === '') return;

      if (content instanceof Node) tooltipElement.replaceChildren(content);
      else tooltipElement.textContent = String(content);

      tooltipElement.dataset.variant = triggerElement.getAttribute(options.variantAttribute) || '';
      tooltipElement.hidden = false;
      if (activeTriggerElement && activeTriggerElement !== triggerElement) {
        activeTriggerElement.removeAttribute('aria-describedby');
      }
      activeTriggerElement = triggerElement;
      triggerElement.setAttribute('aria-describedby', options.tooltipId);

      const anchorRectangle =
        options.followPointer && pointerEvent ? pointerRectangle(pointerEvent) : triggerElement.getBoundingClientRect();
      placeTooltip(anchorRectangle);
    }

    function hide() {
      clearTimeout(showTimerId);
      clearTimeout(hideTimerId);
      tooltipElement.hidden = true;
      if (activeTriggerElement) activeTriggerElement.removeAttribute('aria-describedby');
      activeTriggerElement = null;
    }

    function scheduleShow(triggerElement, pointerEvent) {
      clearTimeout(hideTimerId);
      clearTimeout(showTimerId);
      if (!options.showDelayMilliseconds) return show(triggerElement, pointerEvent);
      showTimerId = setTimeout(() => show(triggerElement, pointerEvent), options.showDelayMilliseconds);
    }

    function scheduleHide() {
      clearTimeout(showTimerId);
      clearTimeout(hideTimerId);
      if (!options.hideDelayMilliseconds) return hide();
      hideTimerId = setTimeout(hide, options.hideDelayMilliseconds);
    }

    function bind(rootElement = document.body) {
      rootElement.addEventListener('pointerover', event => {
        const triggerElement = event.target.closest(triggerSelector);
        if (triggerElement) scheduleShow(triggerElement, event);
      });
      rootElement.addEventListener('pointerout', event => {
        const triggerElement = event.target.closest(triggerSelector);
        if (triggerElement && !triggerElement.contains(event.relatedTarget)) scheduleHide();
      });
      rootElement.addEventListener('focusin', event => {
        const triggerElement = event.target.closest(triggerSelector);
        if (triggerElement) scheduleShow(triggerElement);
      });
      rootElement.addEventListener('focusout', scheduleHide);
      if (options.followPointer) {
        rootElement.addEventListener('pointermove', event => {
          if (!tooltipElement.hidden && activeTriggerElement) placeTooltip(pointerRectangle(event));
        });
      }
      if (options.hideOnScroll) window.addEventListener('scroll', hide, { passive: true });
    }

    return { bind, show, hide, tooltipElement };
  }

  return { createTooltip, calculatePosition };
})();