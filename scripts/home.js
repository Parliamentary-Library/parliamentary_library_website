/*
==============================================================================
Parliamentary Service
==============================================================================
Script:      home.js
Purpose:     Delegates home page fnctionality and animation
------------------------------------------------------------------------------
Author:      Data Unit
==============================================================================
*/
'use strict';
(() => {
  const YEAR_MILLISECONDS = 365 * 24 * 60 * 60 * 1000;
  const GROUPINGS = [['sector', 'By sector'], ['vote', 'By Vote']];
  let sharedTooltip = null;
  const getTooltip = () => (sharedTooltip = sharedTooltip || window.TooltipTools.createTooltip({ placement: 'auto' }));

  // ANIMATIONS
  function initialiseScrollAnimations() {
    var heroSectionElement = document.getElementById('hero-section');
    var heroBackgroundElement = document.getElementById('hero-background');
    var statementParagraphElement = document.getElementById('statement-text');
    var silhouetteSectionElement = document.querySelector('.silhouette');
    var silhouetteElement = document.getElementById('library-silhouette');
    var chapterElements = Array.prototype.slice.call(document.querySelectorAll('.chapter'));
    var entranceElements = chapterElements.concat(document.querySelector('.notice'));
    var parallaxElements = document.querySelectorAll('[data-parallax]');


    var fadeObserver = new IntersectionObserver(function (observerEntries) {
      observerEntries.forEach(function (observerEntry) {
        observerEntry.target.classList.toggle('is-faded-in', observerEntry.isIntersecting);
      });
    }, { rootMargin: '-15% 0px -15% 0px' });

    document.querySelectorAll('[data-fade]').forEach(function (elementToFade) {
      fadeObserver.observe(elementToFade);
    });

    function clampToUnitRange(value) {
      return Math.min(1, Math.max(0, value));
    }

    function updateEntrance(element, viewportHeight) {
      var elementTop = element.getBoundingClientRect().top;
      var isVisible = element.classList.contains('is-visible');

      if (!isVisible && elementTop < viewportHeight * 0.55 && elementTop > -viewportHeight * 0.5) {
        element.classList.add('is-visible');
      } else if (isVisible && (elementTop > viewportHeight * 0.85 || elementTop < -viewportHeight * 0.9)) {
        element.classList.remove('is-visible');
      }

      element.style.setProperty('--enter-progress', window.innerWidth > 900 ? clampToUnitRange(1 - elementTop / viewportHeight) : 1);
    }

    function updateOnScroll() {
      var viewportHeight = window.innerHeight;
      var scrollPosition = window.scrollY;
      var stackingIsActive = window.innerWidth > 900;
      var silhouetteTop = silhouetteSectionElement.getBoundingClientRect().top;

      heroSectionElement.classList.toggle('is-in', scrollPosition < viewportHeight * 0.45);
      heroBackgroundElement.style.transform = 'translateY(' + scrollPosition * 0.25 + 'px) scale(' + (1 + scrollPosition * 0.0002) + ')';


      entranceElements.forEach(function (entranceElement) {
        updateEntrance(entranceElement, viewportHeight);
      });

      chapterElements.forEach(function (chapterElement, chapterIndex) {
        var coveringElement = chapterElements[chapterIndex + 1] || silhouetteSectionElement;
        var coverProgress = clampToUnitRange(1 - coveringElement.getBoundingClientRect().top / viewportHeight);
        chapterElement.style.setProperty('--cover-progress', stackingIsActive ? coverProgress : 0);
      });

      parallaxElements.forEach(function (parallaxElement) {
        var containerBounds = parallaxElement.parentElement.getBoundingClientRect();
        var centreOffset = containerBounds.top + containerBounds.height / 2 - viewportHeight / 2;
        parallaxElement.style.translate = '0 ' + (-centreOffset * parseFloat(parallaxElement.dataset.parallax)) + 'px';
      });

      silhouetteElement.style.transform = 'translateY(' + (1 - clampToUnitRange((viewportHeight - silhouetteTop) / (viewportHeight * 0.9))) * 35 + '%)';
    }

    function requestUpdate() {
      window.requestAnimationFrame(updateOnScroll);
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.requestAnimationFrame(requestUpdate);
  }


//BELECTORATE PROFILES TESTER
  function initialiseElectorateTester() {
    var generalElectorateNames = [
      'Auckland Central', 'Banks Peninsula', 'Botany', 'Christchurch Central', 'Christchurch East',
      'Coromandel', 'Dunedin', 'East Cape', 'East Coast Bays', 'Epsom', 'Glendene', 'Hamilton East',
      'Hamilton West', 'Henderson', 'Hutt South', 'Ilam', 'Invercargill', 'Kaikōura', 'Kaipara ki Mahurangi',
      'Kapiti', 'Kenepuru', 'Māngere', 'Manurewa', 'Maungakiekie', 'Mt Albert', 'Mt Maunganui', 'Mt Roskill',
      'Napier', 'Nelson', 'New Plymouth', 'North Shore', 'Northcote', 'Northland', 'Ōtāhuhu', 'Pakuranga',
      'Palmerston North', 'Papakura', 'Port Waikato', 'Rangitata', 'Rangitīkei', 'Remutaka', 'Rotorua',
      'Selwyn', 'Southland', 'Taieri', 'Takanini', 'Tāmaki', 'Taranaki-King Country', 'Taupō', 'Tauranga',
      'Tukituki', 'Upper Harbour', 'Waikato', 'Wairarapa', 'Waitākere', 'Waitaki', 'Wellington Bays',
      'Wellington North', 'West Coast-Tasman', 'Whanganui', 'Whangaparāoa', 'Whangārei', 'Wigram'
    ];

    var maoriElectorateNames = [
      'Hauraki-Waikato', 'Ikaroa-Rāwhiti', 'Tāmaki Makaurau', 'Te Tai Hauāuru',
      'Te Tai Tokerau', 'Te Tai Tonga', 'Waiariki'
    ];

    var displayNameOverrides = { 'Mt Albert': 'Mount Albert', 'Mt Maunganui': 'Mount Maunganui', 'Mt Roskill': 'Mount Roskill' };
    var defaultElectorateValue = 'Wellington North';

    var testerSearchInputElement = document.getElementById('electorate-search-input-tester');
    var testerClearButtonElement = document.getElementById('electorate-search-clear-tester');
    var testerOptionsListElement = document.getElementById('electorate-options-list-tester');
    var testerCaptionElement = document.getElementById('tester-caption');
    var testerValueElements = document.querySelectorAll('.tester-window [data-stat]');

    var testerCensusRecords = {};
    var visibleOptions = [];
    var activeOptionIndex = -1;

    var electorateOptions = generalElectorateNames.concat(maoriElectorateNames).map(function (electorateName) {
      return { value: electorateName, label: displayNameOverrides[electorateName] || electorateName };
    }).sort(function (firstOption, secondOption) {
      return firstOption.label.localeCompare(secondOption.label, 'en-NZ');
    });

    function normaliseForSearch(text) {
      return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function renderStats(electorateValue) {
      var electorateStats = Object.assign({}, testerCensusRecords[electorateValue]);

      electorateStats.genderSplit = (electorateStats.gender || []).map(function (percentage) {
        return percentage.toFixed(1) + '%';
      }).join(' / ');

      testerValueElements.forEach(function (valueElement) {
        valueElement.textContent = electorateStats[valueElement.dataset.stat] || '–';
        valueElement.classList.remove('is-updating');
        void valueElement.offsetWidth;
        valueElement.classList.add('is-updating');
      });
    }

    function setOptionsListOpen(isOpen) {
      testerOptionsListElement.classList.toggle('is-open', isOpen);
      testerSearchInputElement.setAttribute('aria-expanded', String(isOpen));
      activeOptionIndex = -1;
    }

    function showSelection(label, electorateValue) {
      testerSearchInputElement.value = label;
      testerCaptionElement.textContent = label ? 'Demographic overview for ' + label : 'Demographic overview';
      testerClearButtonElement.classList.toggle('is-visible', label.length > 0);
      renderStats(electorateValue);
      setOptionsListOpen(false);
    }

    function selectElectorate(electorateOption) {
      showSelection(electorateOption.label, electorateOption.value);
    }

    function buildOptionsList(searchText) {
      var normalisedSearchText = normaliseForSearch(searchText.trim());

      visibleOptions = electorateOptions.filter(function (electorateOption) {
        return normaliseForSearch(electorateOption.label).indexOf(normalisedSearchText) !== -1;
      });

      testerOptionsListElement.textContent = '';
      visibleOptions.forEach(function (electorateOption) {
        var optionElement = document.createElement('li');
        optionElement.setAttribute('role', 'option');
        optionElement.textContent = electorateOption.label;
        optionElement.addEventListener('pointerdown', function (pointerEvent) {
          pointerEvent.preventDefault();
          selectElectorate(electorateOption);
        });
        testerOptionsListElement.appendChild(optionElement);
      });

      activeOptionIndex = -1;
    }

    function setActiveOption(newActiveIndex) {
      Array.prototype.forEach.call(testerOptionsListElement.children, function (optionElement, optionIndex) {
        optionElement.classList.toggle('is-active', optionIndex === newActiveIndex);
        optionElement.setAttribute('aria-selected', String(optionIndex === newActiveIndex));
      });
      activeOptionIndex = newActiveIndex;
      testerOptionsListElement.children[newActiveIndex].scrollIntoView({ block: 'nearest' });
    }

    testerSearchInputElement.addEventListener('focus', function () {
      testerSearchInputElement.select();
      buildOptionsList('');
      setOptionsListOpen(true);
    });

    testerSearchInputElement.addEventListener('input', function () {
      buildOptionsList(testerSearchInputElement.value);
      setOptionsListOpen(true);
      testerClearButtonElement.classList.toggle('is-visible', testerSearchInputElement.value.length > 0);
    });

    testerSearchInputElement.addEventListener('blur', function () {
      setOptionsListOpen(false);
    });

    testerSearchInputElement.addEventListener('keydown', function (keyboardEvent) {
      var lastOptionIndex = visibleOptions.length - 1;

      if (keyboardEvent.key === 'ArrowDown' || keyboardEvent.key === 'ArrowUp') {
        keyboardEvent.preventDefault();
        var step = keyboardEvent.key === 'ArrowDown' ? 1 : -1;
        var nextIndex = activeOptionIndex + step;
        testerOptionsListElement.classList.add('is-open');
        setActiveOption(nextIndex > lastOptionIndex ? 0 : nextIndex < 0 ? lastOptionIndex : nextIndex);
      } else if (keyboardEvent.key === 'Enter') {
        keyboardEvent.preventDefault();
        var optionToSelect = visibleOptions[activeOptionIndex] || visibleOptions[0];
        if (optionToSelect) {
          selectElectorate(optionToSelect);
        }
      } else if (keyboardEvent.key === 'Escape') {
        testerSearchInputElement.blur();
      }
    });

    testerClearButtonElement.addEventListener('click', function () {
      showSelection('', null);
      buildOptionsList('');
      testerSearchInputElement.focus();
    });

    Promise.all(['data/general_electorate_census_2023.csv', 'data/maori_electorate_census_2023.csv'].map(loadCensusData))
      .then(function (censusDataSets) {
        censusDataSets.forEach(function (censusData) {
          Object.assign(testerCensusRecords, censusData);
        });

        if (!testerSearchInputElement.value) {
          selectElectorate(electorateOptions.find(function (electorateOption) {
            return electorateOption.value === defaultElectorateValue;
          }));
        }
      })
      .catch(function (error) {
        console.error('Unable to load census data for the electorate tester.', error);
      });

    buildOptionsList('');
  }

  //BUDGET DASHBOARD TESTER!
  function renderDashboardWindow() {
    const dashboardWindow = document.getElementById('dashboard-window');
    if (!dashboardWindow) return;
    const { votes, calculateVoteTotal } = window.BudgetCalculations;
    const { createElement, billions, share } = window.UtilityHelpers;
    const treemapHost = createElement('div', { id: 'dashboard-treemap', class: 'treemap dashboard-treemap' });
    const groupingButtons = GROUPINGS.map(([grouping, label]) => createElement('button', { type: 'button', class: 'btn-small', text: label, onclick: () => renderGrouping(grouping) }));
  
    function buildItems(grouping) {
    const amountBySectorId = {};
    votes.forEach(vote => (amountBySectorId[vote.sector.id] = (amountBySectorId[vote.sector.id] || 0) + calculateVoteTotal(vote)));
    const items = grouping === 'sector'
      ? window.BUDGET_REF.sectors.map(sector => ({ id: sector.id, label: sector.name, value: amountBySectorId[sector.id] || 0, colour: sector.colour, href: 'budget_dashboard.html#/votes?sector=' + sector.id }))
      : votes.map(vote => ({ id: vote.id, label: vote.name, value: calculateVoteTotal(vote), colour: vote.sector.colour, href: 'budget_dashboard.html#/vote/' + vote.id }));
    const totalAmount = items.reduce((runningTotal, item) => runningTotal + item.value, 0);
    return items.sort((first, second) => second.value - first.value).map(item => ({
      ...item,
      text: billions(item.value, true),
      tooltip: `${item.label}: ${billions(item.value, true)}, ${share(item.value, totalAmount)} of the total`
    }));
  }
    function renderGrouping(grouping) {
      window.TreeMapCreator.renderTreemap(treemapHost, buildItems(grouping));
      groupingButtons.forEach((button, index) => {
        const isSelected = GROUPINGS[index][0] === grouping;
        button.setAttribute('aria-pressed', String(isSelected));
        button.classList.toggle('btn-primary', isSelected);
      });
    }

    dashboardWindow.replaceChildren(treemapHost, createElement('div', { class: 'dashboard-toggles' }, groupingButtons));
    getTooltip().bind(dashboardWindow);
    renderGrouping('sector');
  }

  //YOUTH BUDGET TESTER!
  function renderYouthWindow() {
    const stripElement = document.getElementById('budget-strip');
    if (!stripElement) return;
    const metadata = window.youthBudgetMetadata;
    const { createElement } = window.UtilityHelpers;
    const { lookupFigureValue, getSpendingItems, sharePercentages, calculatePerPersonAmount } = window.BudgetCalculations;
    const currentYear = metadata.currentYear;
    const tickerValueElement = document.getElementById('budget-ticker-value');
    const tickerPersonElement = document.getElementById('budget-ticker-person');
    const yearStartTime = new Date(metadata.yearStart).getTime();
    const figures = window.PREFU_metadata;
    const hasValues = values => values && Object.keys(values).length;
    Object.keys(metadata.years).forEach(year => (metadata.years[year].spending = figures.spendingTotal[year]));
    metadata.spending.forEach(area => (area.yearValues = hasValues(area.v) ? { ...area.v } : lookupFigureValue(figures.spending, area.vote, [])));
    metadata.spending.concat(metadata.other).forEach(area => (area.label ||= metadata.labelStyle === 'plain' ? area.plain || area.name : area.name || area.plain));

    function updateTicker() {
      const elapsedShare = Math.min(1, Math.max(0, Date.now() - yearStartTime) / YEAR_MILLISECONDS);
      const spentMillions = metadata.years[currentYear].spending * elapsedShare;
      tickerValueElement.textContent = '$' + Math.round(spentMillions * 1e6).toLocaleString('en-NZ');
      tickerPersonElement.textContent = '$' + calculatePerPersonAmount(spentMillions).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' for every New Zealander';
    }

    const spendingAreas = getSpendingItems(currentYear);
    const shares = sharePercentages(spendingAreas.map(area => area.selectedYearValue));
    stripElement.replaceChildren(...spendingAreas.map((area, index) => {
      const captionText = [area.label, area.desc, '$' + shares[index] + ' of every $100'].filter(Boolean).join('\n');
      return createElement('a', {
        class: 'budget-segment',
        href: '/budget_buddy.html#/explore/spending?area=' + area.id,
        'data-group': area.group,
        'aria-label': captionText.replace(/\n/g, '. '),
        style: { '--segment-share': String(area.selectedYearValue), '--segment-index': String(index) }
      }, createElement('span', { class: 'budget-caption', text: captionText }));
    }));
    getTooltip().bind(stripElement);
    updateTicker();
    setInterval(updateTicker, 1000);
  }

  [initialiseScrollAnimations, initialiseElectorateTester, renderDashboardWindow, renderYouthWindow].forEach(initialiseSection => {
    try {
      initialiseSection();
    } catch (error) {
      console.error('Home page section failed: ' + initialiseSection.name, error);
    }
  });
})();