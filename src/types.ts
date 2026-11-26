import { Timestamp } from 'firebase/firestore';

export const BLUEPRINT_LIMITS = {
  ID_MAX_LEN: 128,
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  LOAN_CODE_REGEX: /^[A-Z0-9-]+$/,
  LOAN_CODE_MAX_LEN: 24,
  NAME_MIN_LEN: 2,
  NAME_MAX_LEN: 120,
  BUSINESS_MAX_LEN: 140,
  SECTOR_MAX_LEN: 80,
  PRODUCT_MAX_LEN: 80,
  REF_CODE_MAX_LEN: 40,
  CHANNEL_MAX_LEN: 60,
  NOTES_MAX_LEN: 240,
  DATE_MAX_LEN: 32,
  PRINCIPAL_MIN: 100,
  PRINCIPAL_MAX: 10000000,
  APR_MIN: 0,
  APR_MAX: 100,
  TERM_MIN: 1,
  TERM_MAX: 120,
} as const;

export type RepaymentCadence = 'Monthly' | 'Bi-weekly' | 'Weekly';
export type LoanStatus = 'Pending Review' | 'Active' | 'Overdue' | 'Settled';
export type TransactionType = 'Repayment' | 'Disbursement' | 'Fee Assessment' | 'Principal Adjustment';
export type TransactionDirection = 'inflow' | 'outflow';
export type TransactionStatus = 'Settled' | 'Pending' | 'Reversed';
export type DeadlineStatus = 'Pending' | 'Due Soon' | 'Overdue' | 'Paid';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  branchName: string;
  role: 'officer' | 'admin';
  seeded: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LoanAccount {
  id: string;
  ownerId: string;
  loanCode: string;
  borrowerName: string;
  businessName: string;
  sector: string;
  productType: string;
  principalAmount: number;
  interestRateApr: number;
  termMonths: number;
  repaymentCadence: RepaymentCadence;
  totalRepayable: number;
  paidAmount: number;
  remainingBalance: number;
  installmentAmount: number;
  status: LoanStatus;
  disbursedDate: string;
  nextDueDate: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LoanTransaction {
  id: string;
  ownerId: string;
  loanId: string;
  loanCode: string;
  borrowerName: string;
  referenceCode: string;
  type: TransactionType;
  direction: TransactionDirection;
  amount: number;
  channel: string;
  status: TransactionStatus;
  occurredAt: string;
  notes: string;
  createdAt: Timestamp;
}

export interface PaymentDeadline {
  id: string;
  ownerId: string;
  loanId: string;
  loanCode: string;
  borrowerName: string;
  installmentNumber: number;
  totalInstallments: number;
  amountDue: number;
  principalPortion: number;
  interestPortion: number;
  dueDate: string;
  status: DeadlineStatus;
  paidAt: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NewLoanInput {
  borrowerName: string;
  businessName: string;
  sector: string;
  productType: string;
  principalAmount: number;
  interestRateApr: number;
  termMonths: number;
  repaymentCadence: RepaymentCadence;
  disburseImmediately: boolean;
}
