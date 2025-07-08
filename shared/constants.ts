// Financial and Goal Category Constants
export const FINANCIAL_CATEGORIES = {
  revenue: [
    "Sales",
    "Services",
    "Consulting",
    "Subscriptions",
    "Licensing",
    "Interest",
    "Dividends",
    "Other"
  ],
  expense: [
    "Marketing",
    "Operations",
    "Salaries",
    "Rent",
    "Utilities",
    "Software",
    "Travel",
    "Equipment",
    "Legal",
    "Insurance",
    "Other"
  ],
  other: [
    "Investment",
    "Loan",
    "Grant",
    "Refund",
    "Transfer",
    "Other"
  ]
} as const;

export const FINANCIAL_TYPES = [
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
  { value: "other", label: "Other" }
] as const;

export type FinancialType = typeof FINANCIAL_TYPES[number]["value"];
export type FinancialCategory = typeof FINANCIAL_CATEGORIES[FinancialType][number];