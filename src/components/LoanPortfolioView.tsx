import React, { useMemo, useState } from 'react';
import { Button, Card, Input, Skeleton } from '@heroui/react';
import { AlertCircle, CheckCircle2, Clock, FileCheck2, Search } from 'lucide-react';
import type { LoanAccount, LoanStatus } from '../types';
import { formatCurrency, formatDisplayDate } from '../utils/formatters';

interface LoanPortfolioViewProps {
  loans: LoanAccount[];
  loading: boolean;
  onSelectLoan: (loanId: string) => void;
  onApproveLoan: (loan: LoanAccount) => Promise<void>;
  onCreateLoanClick: () => void;
}

type StatusFilter = 'All' | LoanStatus;

export function LoanPortfolioView({
  loans,
  loading,
  onSelectLoan,
  onApproveLoan,
  onCreateLoanClick,
}: LoanPortfolioViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const filteredLoans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return loans.filter((loan) => {
      if (statusFilter !== 'All' && loan.status !== statusFilter) return false;
      if (!q) return true;
      return (
        loan.borrowerName.toLowerCase().includes(q) ||
        loan.businessName.toLowerCase().includes(q) ||
        loan.loanCode.toLowerCase().includes(q) ||
        loan.sector.toLowerCase().includes(q)
      );
    });
  }, [loans, statusFilter, searchQuery]);

  const handleApprove = async (loan: LoanAccount) => {
    setApprovingId(loan.id);
    try {
      await onApproveLoan(loan);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <Card className="bg-white border border-slate-200 rounded-lg shadow-none p-0 overflow-hidden">
      <Card.Header className="px-6 py-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Card.Title className="font-display text-base font-semibold text-slate-900 tracking-tight">
            Loan Portfolio Register
          </Card.Title>
          <Card.Description className="text-xs text-slate-500 mt-1">
            Underwrite pending applications, track active repayment ratios, and manage arrears
          </Card.Description>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search borrower or loan code..."
              aria-label="Search loan portfolio"
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 w-60"
            />
          </div>

          <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-md">
            {(['All', 'Overdue', 'Pending Review', 'Active', 'Settled'] as const).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={statusFilter === status ? 'secondary' : 'ghost'}
                onPress={() => setStatusFilter(status)}
                className={`h-7 px-2.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
      </Card.Header>

      <Card.Content className="p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-11 w-full rounded" />
            ))}
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-900">No loan accounts found</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery || statusFilter !== 'All'
                ? 'Adjust your status filter or search query to inspect other facilities.'
                : 'Create your first microfinance loan application to begin servicing.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              {(searchQuery || statusFilter !== 'All') && (
                <Button
                  size="sm"
                  variant="outline"
                  onPress={() => {
                    setSearchQuery('');
                    setStatusFilter('All');
                  }}
                  className="bg-white border-slate-200 text-slate-700 text-xs"
                >
                  Reset Filters
                </Button>
              )}
              <Button
                size="sm"
                variant="primary"
                onPress={onCreateLoanClick}
                className="bg-[#0B192C] text-white text-xs"
              >
                Originate Loan
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-6 whitespace-nowrap">Facility</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Borrower &amp; Enterprise</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Product</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Principal</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Remaining</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Next Due</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-6 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredLoans.map((loan) => {
                  const progressPct =
                    loan.totalRepayable > 0
                      ? Math.min(100, Math.round((loan.paidAmount / loan.totalRepayable) * 100))
                      : 0;

                  return (
                    <tr
                      key={loan.id}
                      onClick={() => onSelectLoan(loan.id)}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-6 font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {loan.loanCode}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-slate-900 leading-tight">
                          {loan.borrowerName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {loan.businessName} · {loan.sector}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-medium text-slate-800 whitespace-nowrap">
                          {loan.productType}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums mt-0.5 whitespace-nowrap">
                          {loan.interestRateApr}% APR · {loan.repaymentCadence}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {formatCurrency(loan.principalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <p className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(loan.remainingBalance)}
                        </p>
                        <p className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                          {progressPct}% repaid
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {loan.nextDueDate ? formatDisplayDate(loan.nextDueDate) : '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            loan.status === 'Overdue'
                              ? 'text-red-700'
                              : loan.status === 'Pending Review'
                                ? 'text-amber-700'
                                : loan.status === 'Settled'
                                  ? 'text-slate-600'
                                  : 'text-emerald-700'
                          }`}
                        >
                          {loan.status === 'Overdue' ? (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          ) : loan.status === 'Pending Review' ? (
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{loan.status}</span>
                        </span>
                      </td>
                      <td
                        className="py-3 px-6 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {loan.status === 'Pending Review' ? (
                          <Button
                            size="sm"
                            variant="primary"
                            isDisabled={approvingId === loan.id}
                            onPress={() => void handleApprove(loan)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium whitespace-nowrap shrink-0"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>
                              {approvingId === loan.id ? 'Disbursing...' : 'Approve & Disburse'}
                            </span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onPress={() => onSelectLoan(loan.id)}
                            className="bg-white border-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap shrink-0"
                          >
                            Manage
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
