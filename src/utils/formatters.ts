import type { DeadlineStatus, RepaymentCadence } from '../types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return formatCurrency(amount);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(base: Date, months: number): Date {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function formatDisplayDate(isoString: string): string {
  if (!isoString) return '—';
  const normalized = isoString.includes('T') ? isoString : `${isoString}T12:00:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

export function computeDayDelta(dueDateIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDateIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(due.getTime())) return 0;
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function resolveDeadlineUrgency(dueDateIso: string, storedStatus: DeadlineStatus): {
  effectiveStatus: DeadlineStatus;
  label: string;
  dayDelta: number;
} {
  if (storedStatus === 'Paid') {
    return { effectiveStatus: 'Paid', label: 'Paid', dayDelta: 0 };
  }
  const delta = computeDayDelta(dueDateIso);
  if (delta < 0) {
    const overdueDays = Math.abs(delta);
    return {
      effectiveStatus: 'Overdue',
      label: `Overdue · ${overdueDays}d`,
      dayDelta: delta,
    };
  }
  if (delta === 0) {
    return {
      effectiveStatus: 'Due Soon',
      label: 'Due Today',
      dayDelta: 0,
    };
  }
  if (delta <= 5) {
    return {
      effectiveStatus: 'Due Soon',
      label: `Due in ${delta}d`,
      dayDelta: delta,
    };
  }
  return {
    effectiveStatus: 'Pending',
    label: `In ${delta} days`,
    dayDelta: delta,
  };
}

export interface AmortizationSummary {
  totalInstallments: number;
  installmentAmount: number;
  totalInterest: number;
  totalRepayable: number;
  schedulePreview: {
    installmentNumber: number;
    dueDate: string;
    amountDue: number;
    principalPortion: number;
    interestPortion: number;
  }[];
}

export function calculateLoanTerms(
  principalAmount: number,
  interestRateApr: number,
  termMonths: number,
  cadence: RepaymentCadence,
  startDate: Date = new Date()
): AmortizationSummary {
  const safePrincipal = Math.max(0, principalAmount);
  const safeApr = Math.max(0, interestRateApr);
  const safeTerm = Math.max(1, Math.round(termMonths));

  const periodsPerMonth = cadence === 'Weekly' ? 4 : cadence === 'Bi-weekly' ? 2 : 1;
  const totalInstallments = Math.max(1, safeTerm * periodsPerMonth);
  const totalInterest = Number(((safePrincipal * (safeApr / 100) * safeTerm) / 12).toFixed(2));
  const totalRepayable = Number((safePrincipal + totalInterest).toFixed(2));
  const installmentAmount = Number((totalRepayable / totalInstallments).toFixed(2));
  const principalPortion = Number((safePrincipal / totalInstallments).toFixed(2));
  const interestPortion = Number((totalInterest / totalInstallments).toFixed(2));

  const schedulePreview: AmortizationSummary['schedulePreview'] = [];
  for (let i = 1; i <= totalInstallments; i += 1) {
    const due =
      cadence === 'Monthly'
        ? addMonths(startDate, i)
        : cadence === 'Bi-weekly'
          ? addDays(startDate, i * 14)
          : addDays(startDate, i * 7);

    const isLast = i === totalInstallments;
    const adjustedAmount = isLast
      ? Number((totalRepayable - installmentAmount * (totalInstallments - 1)).toFixed(2))
      : installmentAmount;

    schedulePreview.push({
      installmentNumber: i,
      dueDate: toIsoDate(due),
      amountDue: adjustedAmount,
      principalPortion,
      interestPortion,
    });
  }

  return {
    totalInstallments,
    installmentAmount,
    totalInterest,
    totalRepayable,
    schedulePreview,
  };
}

export function exportRowsToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
