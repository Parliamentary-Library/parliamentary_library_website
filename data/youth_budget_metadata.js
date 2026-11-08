'use strict';

window.youthBudgetMetadata = {
  years: {
    2627: { label: '2026/27' },
    2526: { label: '2025/26' }
  },

  labelStyle: 'name',

  currentYear: '2627',

  yearStart: '2026-07-01T00:00:00+12:00',
  previousYear: '2526',

  population: 5357300,

  populationDate: '30 June 2026',


  spendGroups: [
    { id: 'welfare', label: 'Social Development' },
    { id: 'ird', label: 'Revenue' },
    { id: 'housing', label: 'Housing and Urban Development' },
    { id: 'health', label: 'Health' },
    { id: 'schools', label: 'Education' },
    { id: 'tertiary', label: 'Tertiary Education' },
    { id: 'transport', label: 'Transport' },
    { id: 'defence', label: 'Defence Force' },
    { id: 'business', label: 'Business and Science' },
    { id: 'finance', label: 'Finance' },
    { id: 'other', label: 'Other spending areas' }
  ],

  spending: [
    {
      id: 'welfare',
      group: 'welfare',
      name: 'Social Development',
      plain: 'Welfare and NZ Super',
      official: 'Vote Social Development',
      vote: 'Social Development',
      desc: 'NZ Superannuation for people 65 and over, benefits such as Jobseeker Support, and other social support.'
    },
    {
      id: 'health',
      group: 'health',
      name: 'Health',
      plain: 'Health',
      official: 'Vote Health',
      vote: 'Health',
      desc: 'Hospitals, GPs and primary care, mental health services and funded medicines.'
    },
    {
      id: 'ird',
      group: 'ird',
      name: 'Revenue',
      plain: 'Payments through Inland Revenue',
      official: 'Vote Revenue',
      vote: 'Revenue',
      desc: 'Mostly support paid through the tax system, such as Working for Families tax credits, plus the cost of running Inland Revenue.'
    },
    {
      id: 'schools',
      group: 'schools',
      name: 'Education',
      plain: 'Schools and early learning',
      official: 'Vote Education',
      vote: 'Education',
      desc: 'Teachers, schools, school buildings and early childhood education.'
    },
    {
      id: 'finance',
      group: 'finance',
      name: 'Finance',
      plain: 'Interest on government debt',
      official: 'Vote Finance',
      vote: 'Finance',
      desc: 'Mainly the interest the Government pays on money it has borrowed, plus managing public finances.'
    },
    {
      id: 'transport',
      group: 'transport',
      name: 'Transport',
      plain: 'Transport',
      official: 'Vote Transport',
      vote: 'Transport',
      desc: 'Roads, public transport, rail and road safety.'
    },
    {
      id: 'housing',
      group: 'housing',
      name: 'Housing and Urban Development',
      plain: 'Housing',
      official: 'Vote Housing and Urban Development',
      vote: 'Housing and Urban Development',
      desc: 'Public housing, housing support and urban development.'
    },
    {
      id: 'defence',
      group: 'defence',
      name: 'Defence Force',
      plain: 'Defence',
      official: 'Vote Defence Force',
      vote: 'Defence Force',
      desc: 'The Navy, Army and Air Force, including equipment and disaster relief.'
    },
    {
      id: 'tertiary',
      group: 'tertiary',
      name: 'Tertiary Education',
      plain: 'Universities and training',
      official: 'Vote Tertiary Education',
      vote: 'Tertiary Education',
      desc: 'Universities, polytechnics, wānanga and apprenticeships.'
    },
    {
      id: 'business',
      group: 'business',
      name: 'Business and Science',
      plain: 'Business and science',
      official: 'Vote Business, Science and Innovation',
      vote: 'Business, Science and Innovation',
      desc: 'Research funding, innovation and support for businesses.'
    }
  ],
  other: {
    id: 'other',
    group: 'other',
    name: 'Other spending areas',
    plain: 'Everything else',
    official: 'All other Votes',
    desc: 'All other areas combined, such as police, courts, prisons, conservation, foreign affairs and the arts.'
  },

  revenueGroups: [
    {
      id: 'earn',
      label: 'Tax on what people earn',
      desc: 'Income tax taken from wages, salaries and other personal income.'
    },
    {
      id: 'buy',
      label: 'Tax on what people buy',
      desc: 'Mainly GST, the 15% included in the price of most things you buy.'
    },
    {
      id: 'biz',
      label: 'Tax on business and other taxes',
      desc: 'Income tax paid by companies, plus smaller taxes and charges collected by the Crown.'
    },
    {
      id: 'nontax',
      label: 'Money that isn’t tax',
      desc: 'Selling goods and services, interest earned and other income.'
    }
  ],
  revenue: [
    {
      id: 'income',
      group: 'earn',
      tone: 'blue-dark',
      name: 'Individuals tax',
      plain: 'Income tax (people)',
      line: 'Individuals Tax',
      desc: 'Income tax paid by individuals.'
    },
    {
      id: 'gst',
      group: 'buy',
      tone: 'blue',
      name: 'GST',
      plain: 'GST',
      line: 'GST',
      desc: 'Goods and services tax, charged on most things people buy.'
    },
    {
      id: 'indirect',
      group: 'buy',
      tone: 'blue-light',
      name: 'Other indirect taxes',
      plain: 'Other taxes on spending',
      line: 'Other indirect taxes',
      desc: 'For example road and truck user charges, and excise duties on fuel and alcohol.'
    },
    {
      id: 'corp',
      group: 'biz',
      tone: 'coral',
      name: 'Corporate tax',
      plain: 'Company tax',
      line: 'Corporate Tax',
      desc: 'Income tax paid by companies.'
    },
    {
      id: 'direct',
      group: 'biz',
      tone: 'coral-dark',
      name: 'Other direct taxes',
      plain: 'Other direct taxes',
      line: 'Other direct taxes',
      desc: 'For example tax taken from interest and dividends before people receive them.'
    },
    {
      id: 'sovereign',
      group: 'biz',
      tone: 'coral-light',
      name: 'Other sovereign revenue',
      plain: 'Other levies and charges',
      official: 'Other sovereign revenue',
      line: 'Other sovereign revenue',
      desc: 'For example ACC levies, Fire and Emergency levies, and money from the emissions trading scheme.'
    },
    {
      id: 'sales',
      group: 'nontax',
      tone: 'yellow',
      name: 'Sales of goods and services',
      plain: 'Sales of goods and services',
      line: 'Sale of goods & services',
      desc: 'Money from things the Government sells.'
    },
    {
      id: 'interest',
      group: 'nontax',
      tone: 'yellow-light',
      name: 'Interest revenue',
      plain: 'Interest earned',
      line: 'Interest revenue',
      desc: 'Interest the Government earns on its own money and investments.'
    },
    {
      id: 'otherrev',
      group: 'nontax',
      tone: 'yellow-dark',
      name: 'Other revenue',
      plain: 'Other income',
      line: 'Other revenue',
      desc: 'Other revenue not shown separately.'
    }
  ],

  brackets: [
    [0, 15600, 0.105],
    [15600, 53500, 0.175],
    [53500, 78100, 0.3],
    [78100, 180000, 0.33],
    [180000, Infinity, 0.39]
  ],
  gstRate: 0.15,

  sources: {
    spending: [
      {
        text: 'Estimates by Vote - Budget 2026 - 28 May 2026',
        url: 'https://budget.govt.nz/budget/2026/by/vote/index.htm'
      }
    ],
    revenue: [
      {
        text: 'Pre-election Economic and Fiscal Update 2026 - 29 September 2026',
        url: 'https://www.treasury.govt.nz/sites/default/files/2026-09/prefu26.pdf'
      },
      {
        text: 'Financial Statements of the Government of New Zealand for the year ended 30 June 2026',
        url: 'https://www.treasury.govt.nz/sites/default/files/2026-10/fsgnz-2026.pdf'
      }
    ],
    revenue_overview: [
        {
          text: 'Pre-Election Fiscal and Economic Update - 22 September 2026',
          url: 'https://www.treasury.govt.nz/publications/efu/pre-election-economic-and-fiscal-update-2026'
        }
      ],

    changes: [
      {
        text: 'Estimates by Vote - Budget 2026 - 28 May 2026',
        url: 'https://budget.govt.nz/budget/2026/by/vote/index.htm'
      }
    ],
    tax: [
      {
        text: 'Taxable income distribution of individuals - Inland Revenue',
        url: 'https://www.ird.govt.nz/about-us/tax-statistics/revenue-refunds/income-distribution'
      },
      {
        text: 'Tax codes and tax rates for individuals - Inland Revenue',
        url: 'https://www.ird.govt.nz/find-my-code'
      }
    ],
    population: [
      {
        text: 'Estimated population of NZ - Stats NZ',
        url: 'https://www.stats.govt.nz/indicators/population-of-nz/'
      }
    ],
    gap: [
  {
    text: 'Pre-Election Economic and Fiscal Update - 22 September 2026',
    url: 'https://www.treasury.govt.nz/publications/efu/pre-election-economic-and-fiscal-update-2026'
  }
]
  },

  faqs: [
    {
      q: 'What is the Budget?',
      a: 'The Budget is the New Zealand Government’s plan for collecting and spending money. The money is mainly collected through taxes and Parliament gives permission for spending (called Appropriations) to different spending areas (called Votes) for the upcoming financial years.'
    },
    {
      q: 'Why does it exist?',
      a: 'The Budget sets out what a government is prioritising over the next year and beyond. It is communicated through a collection of financial documents that outline where money is coming from and where it is going. Without the Budget we wouldn’t be able to reliably track how our money is being collected and how it is being used.'
    },
    {
      q: 'Who makes it?',
      a: 'The Government decides what goes into the Budget, with advice and support from the [Treasury](https://www.treasury.govt.nz/publications/budgets). The Minister of Finance then presents the Budget to Parliament. You can watch Hon Nicola Willis present Budget 2026 [here](https://www.youtube.com/watch?v=v36hXso2xsw). For more detailed information on the Budget cycle visit [Budget Day 101](https://www3.parliament.nz/en/visit-and-learn/how-parliament-works/the-budget/budget-day-101/).'
    },
    {
      q: 'What alternatives are there?',
      a: 'In the past, to offer an alternative, parties in opposition have presented their own budget around Budget Day.\n\nPrevious Alternative Budgets include:\n- “[Green Budget 2025](https://www.greens.org.nz/green_budget_2025)” *Green Party of Aotearoa* (14 May 2025).\n- “[ACT’s Alternative Budget: End the waste, fix the economy](https://www.act.org.nz/news/acts-alternative-budget-end-the-waste-fix-the-economy)” *ACT Party* (21 September 2023).'
    },
    {
      q: 'Why should I care?',
      a: 'Decisions in the Budget can affect you, the people you care about, and the opportunities available in the future. They also involve choices about where public money is spent. At the end of the day, the Budget is an opportunity to look at those choices and decide what you think about them.'
    },
    {
      q: 'How can I affect the Budget?',
      a: 'The Budget affects your future, and you can have a say:\n- Tell Parliament what you think: You can make a submission on the Government’s Budget priorities and ask to speak to the committee considering them: [www3.parliament.nz](https://www3.parliament.nz/mi/pb/sc/make-a-submission/document/54SCFIN_SCF_9E3F7395-6351-42E6-5664-08DE3C3DC81D/budget-policy-statement-2026/). \n- Talk to an MP: Contact an MP to share your views, raise concerns or ask questions about the Budget.'
    },
    {
      q: 'Who can you talk to about this?',
      a: 'If you want to discuss the impact of the Budget on your local community you should contact your local MP. [Find your local MP](https://www3.parliament.nz/en/mps-and-electorates/members-of-parliament). If you are interested in a specific topic area in the budget (i.e. Media, Pacific Peoples, Mental Health, Tertiary Education) you should contact the Minister who holds the relevant portfolio. [See the list of Ministers and their portfolios](https://www.dpmc.govt.nz/our-business-units/cabinet-office/ministers-and-their-portfolios/ministerial-list). Alternatively you could contact the Opposition spokesperson for the topic you are interested in.'
    }
  ],

  glossary: [
    {
      id: 'budget',
      term: 'Budget',
      def: 'The Government’s plan for how much money it expects to collect and spend over one year. Parliament has to approve the spending.'
    },
    {
      id: 'year',
      term: 'Financial year',
      def: 'The Government’s year runs from 1 July to 30 June. “2026/27” means 1 July 2026 to 30 June 2027.'
    },
    { id: 'revenue', term: 'Revenue', def: 'Money the Government collects. Most of it is tax.' },
    {
      id: 'spending',
      term: 'Spending',
      def: 'Money the Government pays out - on services, support payments, wages, buildings and interest.'
    },
    {
      id: 'deficit',
      term: 'Deficit',
      def: 'When the Government spends more than it collects in a year. The difference is usually borrowed.'
    },
    { id: 'surplus', term: 'Surplus', def: 'When the Government collects more than it spends in a year.' },
    {
      id: 'borrowing',
      term: 'Borrowing',
      def: 'When the Government needs more money than it collects, it borrows, mostly by selling government bonds. It pays interest on what it owes.'
    },
    {
      id: 'vote',
      term: 'Vote',
      def: 'A group of spending that one minister is responsible for, such as Vote Health. Parliament votes to approve each one.'
    },
    {
      id: 'nzsuper',
      term: 'NZ Super',
      def: 'New Zealand Superannuation: a regular payment to people aged 65 and over who meet residency rules. It is one of the biggest single costs in the Budget.'
    },
    {
      id: 'gst',
      term: 'GST',
      def: 'Goods and services tax. 15% is added to the price of most things you buy, so it is already included in the price you see.'
    },
    {
      id: 'incometax',
      term: 'Income tax',
      def: 'Tax on money you earn. Income is taxed in steps: the first part at a lower rate, and each step above that at a higher rate.'
    }
  ]
};
