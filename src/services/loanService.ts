import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BLUEPRINT_LIMITS,
  DeadlineStatus,
  LoanAccount,
  LoanTransaction,
  NewLoanInput,
  PaymentDeadline,
  UserProfile,
} from '../types';
import { addDays, calculateLoanTerms, toIsoDate } from '../utils/formatters';

function sanitizeString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function generateDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.slice(0, BLUEPRINT_LIMITS.ID_MAX_LEN);
}

function generateLoanCode(): string {
  const num = Math.floor(4100 + Math.random() * 5800);
  return `LN-${num}`;
}

function generateRefCode(prefix: string): string {
  const num = Math.floor(10000 + Math.random() * 89999);
  return `${prefix}-${num}`;
}

export async function ensureUserProfileAndSeed(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  let snapshot;
  try {
    snapshot = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
  }

  if (snapshot.exists()) {
    return snapshot.data() as UserProfile;
  }

  const batch = writeBatch(db);
  const displayName = sanitizeString(user.displayName || user.email?.split('@')[0] || 'Portfolio Officer', BLUEPRINT_LIMITS.NAME_MAX_LEN);
  const email = sanitizeString(user.email || 'officer@meridianmfb.com', 200);
  const role: 'officer' | 'admin' = email === 'inioluwadavid05@gmail.com' ? 'admin' : 'officer';

  batch.set(userRef, {
    uid: user.uid,
    displayName,
    email,
    branchName: 'Central Commercial Desk',
    role,
    seeded: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const today = new Date();
  const isoToday = toIsoDate(today);

  // Seed 5 representative corporate microfinance loans, transactions, and payment deadlines
  const loanAId = `loan_${user.uid.slice(0, 8)}_4082`;
  const loanBId = `loan_${user.uid.slice(0, 8)}_4079`;
  const loanCId = `loan_${user.uid.slice(0, 8)}_4074`;
  const loanDId = `loan_${user.uid.slice(0, 8)}_4091`;
  const loanEId = `loan_${user.uid.slice(0, 8)}_4061`;

  // Loan A: Overdue micro-enterprise working capital loan
  batch.set(doc(db, 'loans', loanAId), {
    ownerId: user.uid,
    loanCode: 'LN-4082',
    borrowerName: 'Amina Bello',
    businessName: 'Bello Agro-Processing Ltd',
    sector: 'Agri-Supply',
    productType: 'Working Capital',
    principalAmount: 18000,
    interestRateApr: 14.5,
    termMonths: 12,
    repaymentCadence: 'Monthly',
    totalRepayable: 20610,
    paidAmount: 6870,
    remainingBalance: 13740,
    installmentAmount: 1717.5,
    status: 'Overdue',
    disbursedDate: toIsoDate(addDays(today, -125)),
    nextDueDate: toIsoDate(addDays(today, -3)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Loan B: Active retail inventory bridge loan
  batch.set(doc(db, 'loans', loanBId), {
    ownerId: user.uid,
    loanCode: 'LN-4079',
    borrowerName: 'Kofi Mensah',
    businessName: 'Accra Meridian Textiles',
    sector: 'Retail Trade',
    productType: 'Inventory Bridge',
    principalAmount: 12500,
    interestRateApr: 12.0,
    termMonths: 10,
    repaymentCadence: 'Bi-weekly',
    totalRepayable: 13750,
    paidAmount: 4125,
    remainingBalance: 9625,
    installmentAmount: 687.5,
    status: 'Active',
    disbursedDate: toIsoDate(addDays(today, -90)),
    nextDueDate: toIsoDate(addDays(today, 2)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Loan C: Active equipment micro-lease
  batch.set(doc(db, 'loans', loanCId), {
    ownerId: user.uid,
    loanCode: 'LN-4074',
    borrowerName: 'Priya Nair',
    businessName: 'Nair Cold-Chain Logistics',
    sector: 'Logistics',
    productType: 'Equipment Micro-Lease',
    principalAmount: 24000,
    interestRateApr: 11.5,
    termMonths: 18,
    repaymentCadence: 'Monthly',
    totalRepayable: 28140,
    paidAmount: 7816.65,
    remainingBalance: 20323.35,
    installmentAmount: 1563.33,
    status: 'Active',
    disbursedDate: toIsoDate(addDays(today, -155)),
    nextDueDate: toIsoDate(addDays(today, 4)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Loan D: Pending Review underwriting loan
  batch.set(doc(db, 'loans', loanDId), {
    ownerId: user.uid,
    loanCode: 'LN-4091',
    borrowerName: 'Mateo Alvarez',
    businessName: 'Alvarez Precision Packaging',
    sector: 'Light Manufacturing',
    productType: 'Working Capital',
    principalAmount: 15000,
    interestRateApr: 13.0,
    termMonths: 12,
    repaymentCadence: 'Monthly',
    totalRepayable: 16950,
    paidAmount: 0,
    remainingBalance: 16950,
    installmentAmount: 1412.5,
    status: 'Pending Review',
    disbursedDate: '',
    nextDueDate: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Loan E: Settled seasonal credit facility
  batch.set(doc(db, 'loans', loanEId), {
    ownerId: user.uid,
    loanCode: 'LN-4061',
    borrowerName: 'Helena Osei',
    businessName: 'Osei Craft & Timber',
    sector: 'Light Manufacturing',
    productType: 'Seasonal Credit',
    principalAmount: 8500,
    interestRateApr: 10.5,
    termMonths: 6,
    repaymentCadence: 'Monthly',
    totalRepayable: 8946.25,
    paidAmount: 8946.25,
    remainingBalance: 0,
    installmentAmount: 1491.04,
    status: 'Settled',
    disbursedDate: toIsoDate(addDays(today, -200)),
    nextDueDate: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Seed Recent Transactions
  const seedTransactions: Omit<LoanTransaction, 'id' | 'createdAt'>[] = [
    {
      ownerId: user.uid,
      loanId: loanBId,
      loanCode: 'LN-4079',
      borrowerName: 'Kofi Mensah',
      referenceCode: 'TX-88412',
      type: 'Repayment',
      direction: 'inflow',
      amount: 687.5,
      channel: 'ACH Transfer',
      status: 'Settled',
      occurredAt: toIsoDate(addDays(today, -1)),
      notes: 'Installment #6 cleared via corporate ACH',
    },
    {
      ownerId: user.uid,
      loanId: loanCId,
      loanCode: 'LN-4074',
      borrowerName: 'Priya Nair',
      referenceCode: 'TX-88394',
      type: 'Repayment',
      direction: 'inflow',
      amount: 1563.33,
      channel: 'Wire Clearing',
      status: 'Settled',
      occurredAt: toIsoDate(addDays(today, -4)),
      notes: 'Installment #5 fleet lease payment settled',
    },
    {
      ownerId: user.uid,
      loanId: loanEId,
      loanCode: 'LN-4061',
      borrowerName: 'Helena Osei',
      referenceCode: 'TX-88340',
      type: 'Repayment',
      direction: 'inflow',
      amount: 1491.04,
      channel: 'Mobile Treasury',
      status: 'Settled',
      occurredAt: toIsoDate(addDays(today, -9)),
      notes: 'Final installment settlement — facility closed',
    },
    {
      ownerId: user.uid,
      loanId: loanAId,
      loanCode: 'LN-4082',
      borrowerName: 'Amina Bello',
      referenceCode: 'TX-88289',
      type: 'Fee Assessment',
      direction: 'outflow',
      amount: 45.0,
      channel: 'System Ledger',
      status: 'Pending',
      occurredAt: toIsoDate(addDays(today, -2)),
      notes: 'Grace period expiry late fee notice',
    },
    {
      ownerId: user.uid,
      loanId: loanBId,
      loanCode: 'LN-4079',
      borrowerName: 'Kofi Mensah',
      referenceCode: 'TX-88105',
      type: 'Disbursement',
      direction: 'outflow',
      amount: 12500.0,
      channel: 'Wire Clearing',
      status: 'Settled',
      occurredAt: toIsoDate(addDays(today, -90)),
      notes: 'Initial principal disbursement to Accra Meridian Textiles',
    },
  ];

  seedTransactions.forEach((tx, index) => {
    const txId = `tx_${user.uid.slice(0, 8)}_${index + 1}`;
    batch.set(doc(db, 'transactions', txId), {
      ...tx,
      createdAt: serverTimestamp(),
    });
  });

  // Seed Pending & Paid Payment Deadlines
  const seedDeadlines: Omit<PaymentDeadline, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      ownerId: user.uid,
      loanId: loanAId,
      loanCode: 'LN-4082',
      borrowerName: 'Amina Bello',
      installmentNumber: 5,
      totalInstallments: 12,
      amountDue: 1717.5,
      principalPortion: 1500.0,
      interestPortion: 217.5,
      dueDate: toIsoDate(addDays(today, -3)),
      status: 'Overdue',
      paidAt: '',
    },
    {
      ownerId: user.uid,
      loanId: loanBId,
      loanCode: 'LN-4079',
      borrowerName: 'Kofi Mensah',
      installmentNumber: 7,
      totalInstallments: 20,
      amountDue: 687.5,
      principalPortion: 625.0,
      interestPortion: 62.5,
      dueDate: toIsoDate(addDays(today, 2)),
      status: 'Due Soon',
      paidAt: '',
    },
    {
      ownerId: user.uid,
      loanId: loanCId,
      loanCode: 'LN-4074',
      borrowerName: 'Priya Nair',
      installmentNumber: 6,
      totalInstallments: 18,
      amountDue: 1563.33,
      principalPortion: 1333.33,
      interestPortion: 230.0,
      dueDate: toIsoDate(addDays(today, 4)),
      status: 'Due Soon',
      paidAt: '',
    },
    {
      ownerId: user.uid,
      loanId: loanBId,
      loanCode: 'LN-4079',
      borrowerName: 'Kofi Mensah',
      installmentNumber: 8,
      totalInstallments: 20,
      amountDue: 687.5,
      principalPortion: 625.0,
      interestPortion: 62.5,
      dueDate: toIsoDate(addDays(today, 16)),
      status: 'Pending',
      paidAt: '',
    },
    {
      ownerId: user.uid,
      loanId: loanAId,
      loanCode: 'LN-4082',
      borrowerName: 'Amina Bello',
      installmentNumber: 6,
      totalInstallments: 12,
      amountDue: 1717.5,
      principalPortion: 1500.0,
      interestPortion: 217.5,
      dueDate: toIsoDate(addDays(today, 27)),
      status: 'Pending',
      paidAt: '',
    },
    {
      ownerId: user.uid,
      loanId: loanCId,
      loanCode: 'LN-4074',
      borrowerName: 'Priya Nair',
      installmentNumber: 7,
      totalInstallments: 18,
      amountDue: 1563.33,
      principalPortion: 1333.33,
      interestPortion: 230.0,
      dueDate: toIsoDate(addDays(today, 34)),
      status: 'Pending',
      paidAt: '',
    },
  ];

  seedDeadlines.forEach((dl, index) => {
    const dlId = `dl_${user.uid.slice(0, 8)}_${index + 1}`;
    batch.set(doc(db, 'deadlines', dlId), {
      ...dl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }

  return {
    uid: user.uid,
    displayName,
    email,
    branchName: 'Central Commercial Desk',
    role,
    seeded: true,
    createdAt: snapshot.data()?.createdAt,
    updatedAt: snapshot.data()?.updatedAt,
  };
}

export function subscribeToLoans(
  uid: string,
  onData: (loans: LoanAccount[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'loans'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: LoanAccount[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LoanAccount, 'id'>),
      }));
      items.sort((a, b) => {
        const order: Record<string, number> = {
          Overdue: 0,
          'Pending Review': 1,
          Active: 2,
          Settled: 3,
        };
        const diff = (order[a.status] ?? 4) - (order[b.status] ?? 4);
        if (diff !== 0) return diff;
        return b.loanCode.localeCompare(a.loanCode);
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'loans');
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeToTransactions(
  uid: string,
  onData: (transactions: LoanTransaction[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'transactions'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: LoanTransaction[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LoanTransaction, 'id'>),
      }));
      items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'transactions');
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeToDeadlines(
  uid: string,
  onData: (deadlines: PaymentDeadline[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'deadlines'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: PaymentDeadline[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PaymentDeadline, 'id'>),
      }));
      items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'deadlines');
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function createLoanApplication(uid: string, input: NewLoanInput): Promise<string> {
  const borrowerName = sanitizeString(input.borrowerName, BLUEPRINT_LIMITS.NAME_MAX_LEN);
  const businessName = sanitizeString(input.businessName, BLUEPRINT_LIMITS.BUSINESS_MAX_LEN);
  const sector = sanitizeString(input.sector, BLUEPRINT_LIMITS.SECTOR_MAX_LEN);
  const productType = sanitizeString(input.productType, BLUEPRINT_LIMITS.PRODUCT_MAX_LEN);
  const principalAmount = Math.min(
    BLUEPRINT_LIMITS.PRINCIPAL_MAX,
    Math.max(BLUEPRINT_LIMITS.PRINCIPAL_MIN, Number(input.principalAmount))
  );
  const interestRateApr = Math.min(
    BLUEPRINT_LIMITS.APR_MAX,
    Math.max(BLUEPRINT_LIMITS.APR_MIN, Number(input.interestRateApr))
  );
  const termMonths = Math.min(
    BLUEPRINT_LIMITS.TERM_MAX,
    Math.max(BLUEPRINT_LIMITS.TERM_MIN, Math.round(Number(input.termMonths)))
  );

  const today = new Date();
  const isoToday = toIsoDate(today);
  const summary = calculateLoanTerms(
    principalAmount,
    interestRateApr,
    termMonths,
    input.repaymentCadence,
    today
  );

  const loanId = generateDocId('loan');
  const loanCode = generateLoanCode();
  const batch = writeBatch(db);

  const nextDueDate = input.disburseImmediately ? summary.schedulePreview[0]?.dueDate || isoToday : '';

  batch.set(doc(db, 'loans', loanId), {
    ownerId: uid,
    loanCode,
    borrowerName,
    businessName,
    sector,
    productType,
    principalAmount,
    interestRateApr,
    termMonths,
    repaymentCadence: input.repaymentCadence,
    totalRepayable: summary.totalRepayable,
    paidAmount: 0,
    remainingBalance: summary.totalRepayable,
    installmentAmount: summary.installmentAmount,
    status: input.disburseImmediately ? 'Active' : 'Pending Review',
    disbursedDate: input.disburseImmediately ? isoToday : '',
    nextDueDate,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (input.disburseImmediately) {
    const txId = generateDocId('tx');
    batch.set(doc(db, 'transactions', txId), {
      ownerId: uid,
      loanId,
      loanCode,
      borrowerName,
      referenceCode: generateRefCode('TX'),
      type: 'Disbursement',
      direction: 'outflow',
      amount: principalAmount,
      channel: 'Wire Clearing',
      status: 'Settled',
      occurredAt: isoToday,
      notes: sanitizeString(`Initial disbursement for ${businessName}`, BLUEPRINT_LIMITS.NOTES_MAX_LEN),
      createdAt: serverTimestamp(),
    });

    const installmentsToCreate = summary.schedulePreview.slice(0, 6);
    installmentsToCreate.forEach((inst, idx) => {
      const dlId = generateDocId(`dl${idx}`);
      const status: DeadlineStatus = idx === 0 ? 'Pending' : 'Pending';
      batch.set(doc(db, 'deadlines', dlId), {
        ownerId: uid,
        loanId,
        loanCode,
        borrowerName,
        installmentNumber: inst.installmentNumber,
        totalInstallments: summary.totalInstallments,
        amountDue: inst.amountDue,
        principalPortion: inst.principalPortion,
        interestPortion: inst.interestPortion,
        dueDate: inst.dueDate,
        status,
        paidAt: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `loans/${loanId}`);
  }

  return loanId;
}

export async function approveAndDisburseLoan(uid: string, loan: LoanAccount): Promise<void> {
  const today = new Date();
  const isoToday = toIsoDate(today);
  const summary = calculateLoanTerms(
    loan.principalAmount,
    loan.interestRateApr,
    loan.termMonths,
    loan.repaymentCadence,
    today
  );

  const batch = writeBatch(db);
  const nextDueDate = summary.schedulePreview[0]?.dueDate || isoToday;

  batch.update(doc(db, 'loans', loan.id), {
    status: 'Active',
    disbursedDate: isoToday,
    nextDueDate,
    updatedAt: serverTimestamp(),
  });

  const txId = generateDocId('tx');
  batch.set(doc(db, 'transactions', txId), {
    ownerId: uid,
    loanId: loan.id,
    loanCode: loan.loanCode,
    borrowerName: loan.borrowerName,
    referenceCode: generateRefCode('TX'),
    type: 'Disbursement',
    direction: 'outflow',
    amount: loan.principalAmount,
    channel: 'Wire Clearing',
    status: 'Settled',
    occurredAt: isoToday,
    notes: sanitizeString(`Approved & disbursed to ${loan.businessName}`, BLUEPRINT_LIMITS.NOTES_MAX_LEN),
    createdAt: serverTimestamp(),
  });

  const installmentsToCreate = summary.schedulePreview.slice(0, 6);
  installmentsToCreate.forEach((inst, idx) => {
    const dlId = generateDocId(`dl${idx}`);
    batch.set(doc(db, 'deadlines', dlId), {
      ownerId: uid,
      loanId: loan.id,
      loanCode: loan.loanCode,
      borrowerName: loan.borrowerName,
      installmentNumber: inst.installmentNumber,
      totalInstallments: summary.totalInstallments,
      amountDue: inst.amountDue,
      principalPortion: inst.principalPortion,
      interestPortion: inst.interestPortion,
      dueDate: inst.dueDate,
      status: 'Pending',
      paidAt: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `loans/${loan.id}`);
  }
}

export async function recordDeadlinePayment(
  uid: string,
  loan: LoanAccount,
  deadline: PaymentDeadline,
  allDeadlinesForLoan: PaymentDeadline[],
  channel: string,
  notes: string
): Promise<void> {
  const isoToday = toIsoDate(new Date());
  const paymentAmount = Math.min(loan.remainingBalance, deadline.amountDue);
  const newPaid = Number((loan.paidAmount + paymentAmount).toFixed(2));
  const newRemaining = Math.max(0, Number((loan.remainingBalance - paymentAmount).toFixed(2)));
  const isSettled = newRemaining <= 0.05;

  const remainingOpenDeadlines = allDeadlinesForLoan
    .filter((d) => d.id !== deadline.id && d.status !== 'Paid')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const hasRemainingOverdue = remainingOpenDeadlines.some((d) => d.dueDate < isoToday);
  const nextStatus = isSettled ? 'Settled' : hasRemainingOverdue ? 'Overdue' : 'Active';
  const nextDueDate = isSettled ? '' : remainingOpenDeadlines[0]?.dueDate || loan.nextDueDate;

  const batch = writeBatch(db);

  batch.update(doc(db, 'deadlines', deadline.id), {
    status: 'Paid',
    paidAt: isoToday,
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'loans', loan.id), {
    paidAmount: newPaid,
    remainingBalance: isSettled ? 0 : newRemaining,
    status: nextStatus,
    nextDueDate,
    updatedAt: serverTimestamp(),
  });

  const txId = generateDocId('tx');
  batch.set(doc(db, 'transactions', txId), {
    ownerId: uid,
    loanId: loan.id,
    loanCode: loan.loanCode,
    borrowerName: loan.borrowerName,
    referenceCode: generateRefCode('TX'),
    type: 'Repayment',
    direction: 'inflow',
    amount: paymentAmount,
    channel: sanitizeString(channel || 'ACH Transfer', BLUEPRINT_LIMITS.CHANNEL_MAX_LEN),
    status: 'Settled',
    occurredAt: isoToday,
    notes: sanitizeString(
      notes || `Installment #${deadline.installmentNumber} repayment recorded`,
      BLUEPRINT_LIMITS.NOTES_MAX_LEN
    ),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `deadlines/${deadline.id}`);
  }
}

export async function recordDirectLoanRepayment(
  uid: string,
  loan: LoanAccount,
  amount: number,
  channel: string,
  notes: string
): Promise<void> {
  const isoToday = toIsoDate(new Date());
  const safeAmount = Math.min(loan.remainingBalance, Math.max(0.01, Number(amount.toFixed(2))));
  const newPaid = Number((loan.paidAmount + safeAmount).toFixed(2));
  const newRemaining = Math.max(0, Number((loan.remainingBalance - safeAmount).toFixed(2)));
  const isSettled = newRemaining <= 0.05;

  const batch = writeBatch(db);

  batch.update(doc(db, 'loans', loan.id), {
    paidAmount: newPaid,
    remainingBalance: isSettled ? 0 : newRemaining,
    status: isSettled ? 'Settled' : loan.status,
    nextDueDate: isSettled ? '' : loan.nextDueDate,
    updatedAt: serverTimestamp(),
  });

  const txId = generateDocId('tx');
  batch.set(doc(db, 'transactions', txId), {
    ownerId: uid,
    loanId: loan.id,
    loanCode: loan.loanCode,
    borrowerName: loan.borrowerName,
    referenceCode: generateRefCode('TX'),
    type: 'Repayment',
    direction: 'inflow',
    amount: safeAmount,
    channel: sanitizeString(channel || 'ACH Transfer', BLUEPRINT_LIMITS.CHANNEL_MAX_LEN),
    status: 'Settled',
    occurredAt: isoToday,
    notes: sanitizeString(notes || 'Ad-hoc principal & interest payment', BLUEPRINT_LIMITS.NOTES_MAX_LEN),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `loans/${loan.id}`);
  }
}
