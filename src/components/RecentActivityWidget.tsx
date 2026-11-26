import React, { useMemo, useState } from 'react';
import { Button, Card, Input, Skeleton, Tabs } from '@heroui/react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  Search,
} from 'lucide-react';
import type { LoanAccount, LoanTransaction, PaymentDeadline } from '../types';
import {
  exportRowsToCsv,
  formatCurrency,
  formatDisplayDate,
  resolveDeadlineUrgency,
} from '../utils/formatters';

interface RecentActivityWidgetProps {
  loans: LoanAccount[];
  transactions: LoanTransaction[];
  deadlines: PaymentDeadline[];
  loading: boolean;
  onSelectLoan: (loanId: string) => void;
  onRecordPayment: (deadline: PaymentDeadline) => void;
  onCreateLoanClick: () => void;
  maxRowsPerSection?: number;
  title?: string;
  subtitle?: string;
}

type WidgetTab = 'all' | 'transactions' | 'deadlines';
type UrgencyFilter = 'all' | 'Overdue' | 'Due Soon' | 'Pending';

export function RecentActivityWidget({
  loans,
  transactions,
  deadlines,
  loading,
  onSelectLoan,
  onRecordPayment,
  onCreateLoanClick,
  maxRowsPerSection,
  title = 'Recent Transactions & Payment Deadlines',
  subtitle = 'Live settlement activity and upcoming installment obligations across your portfolio',
}: RecentActivityWidgetProps) {
  const [activeTab, setActiveTab] = useState<WidgetTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const pendingDeadlines = useMemo(() => {
    return deadlines
      .filter((d) => d.status !== 'Paid')
      .map((d) => ({
        deadline: d,
        urgency: resolveDeadlineUrgency(d.dueDate, d.status),
      }))
      .filter(({ deadline, urgency }) => {
        if (urgencyFilter !== 'all' && urgency.effectiveStatus !== urgencyFilter) {
          return false;
        }
        if (!normalizedQuery) return true;
        return (
          deadline.borrowerName.toLowerCase().includes(normalizedQuery) ||
          deadline.loanCode.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((a, b) => a.urgency.dayDelta - b.urgency.dayDelta);
  }, [deadlines, normalizedQuery, urgencyFilter]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!normalizedQuery) return true;
      return (
        tx.borrowerName.toLowerCase().includes(normalizedQuery) ||
        tx.loanCode.toLowerCase().includes(normalizedQuery) ||
        tx.referenceCode.toLowerCase().includes(normalizedQuery) ||
        tx.type.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [transactions, normalizedQuery]);

  const visibleDeadlines =
    maxRowsPerSection && activeTab === 'all'
      ? pendingDeadlines.slice(0, maxRowsPerSection)
      : pendingDeadlines;

  const visibleTransactions =
    maxRowsPerSection && activeTab === 'all'
      ? filteredTransactions.slice(0, maxRowsPerSection)
      : filteredTransactions;

  const handleExportCsv = () => {
    if (activeTab === 'deadlines') {
      exportRowsToCsv(
        'pending-payment-deadlines.csv',
        ['Loan Code', 'Borrower', 'Installment', 'Due Date', 'Status', 'Amount Due'],
        pendingDeadlines.map(({ deadline, urgency }) => [
          deadline.loanCode,
          deadline.borrowerName,
          `${deadline.installmentNumber}/${deadline.totalInstallments}`,
          deadline.dueDate,
          urgency.label,
          deadline.amountDue.toFixed(2),
        ])
      );
      return;
    }

    exportRowsToCsv(
      'loan-transactions.csv',
      ['Reference', 'Loan Code', 'Borrower', 'Type', 'Channel', 'Date', 'Status', 'Amount'],
      filteredTransactions.map((tx) => [
        tx.referenceCode,
        tx.loanCode,
        tx.borrowerName,
        tx.type,
        tx.channel,
        tx.occurredAt,
        tx.status,
        (tx.direction === 'inflow' ? tx.amount : -tx.amount).toFixed(2),
      ])
    );
  };

  const loanExists = (loanId: string) => loans.some((l) => l.id === loanId);

  return (
    <Card
      aria-label="Recent loan transactions and pending payment deadlines"
      className="bg-white border border-slate-200 rounded-lg shadow-none p-0 overflow-hidden"
    >
      {/* Widget Header & HeroUI Tabs */}
      <Card.Header className="px-6 py-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Card.Title className="font-display text-base font-semibold text-slate-900 tracking-tight">
            {title}
          </Card.Title>
          <Card.Description className="text-xs text-slate-500 mt-1">
            {subtitle}
          </Card.Description>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as WidgetTab)}
            variant="primary"
          >
            <Tabs.ListContainer>
              <Tabs.List
                aria-label="Activity view filter"
                className="bg-slate-100 border border-slate-200 p-1 rounded-md"
              >
                <Tabs.Tab
                  id="all"
                  className="px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0"
                >
                  Combined View
                  <Tabs.Indicator className="bg-white rounded shadow-xs" />
                </Tabs.Tab>
                <Tabs.Tab
                  id="deadlines"
                  className="px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0"
                >
                  Pending Deadlines ({pendingDeadlines.length})
                  <Tabs.Indicator className="bg-white rounded shadow-xs" />
                </Tabs.Tab>
                <Tabs.Tab
                  id="transactions"
                  className="px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0"
                >
                  Recent Transactions ({filteredTransactions.length})
                  <Tabs.Indicator className="bg-white rounded shadow-xs" />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>

          <Button
            size="sm"
            variant="outline"
            isDisabled={loading || (filteredTransactions.length === 0 && pendingDeadlines.length === 0)}
            onPress={handleExportCsv}
            className="bg-white border-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </Card.Header>

      {/* Search & Deadline Urgency Toolbar */}
      <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by borrower, loan ID, or reference..."
            aria-label="Filter transactions and deadlines"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {activeTab !== 'transactions' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-500 mr-1">Deadline status:</span>
            {(['all', 'Overdue', 'Due Soon', 'Pending'] as const).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={urgencyFilter === status ? 'primary' : 'outline'}
                onPress={() => setUrgencyFilter(status)}
                className={`h-7 px-2.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                  urgencyFilter === status
                    ? 'bg-[#0B192C] text-white'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Loading Skeleton State */}
      <Card.Content className="p-0">
        {loading ? (
          <div className="divide-y divide-slate-200">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48 rounded" />
                  <Skeleton className="h-3 w-64 rounded" />
                </div>
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-8 w-28 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div>
            {/* Pending Payment Deadlines List */}
            {activeTab !== 'transactions' && (
              <div>
                <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Pending Payment Deadlines
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {pendingDeadlines.length} open
                  </span>
                </div>

                {visibleDeadlines.length === 0 ? (
                  <div className="px-6 py-8 text-center border-b border-slate-200">
                    <p className="text-sm font-medium text-slate-800">
                      {normalizedQuery || urgencyFilter !== 'all'
                        ? 'No payment deadlines match your current filter'
                        : 'No pending payment deadlines scheduled'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {normalizedQuery || urgencyFilter !== 'all'
                        ? 'Clear your search query or status filter to see all scheduled obligations.'
                        : 'Disburse a loan facility to generate installment payment deadlines.'}
                    </p>
                    {(normalizedQuery || urgencyFilter !== 'all') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => {
                          setSearchQuery('');
                          setUrgencyFilter('all');
                        }}
                        className="mt-3 bg-white border-slate-200 text-slate-700 text-xs"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200" role="list">
                    {visibleDeadlines.map(({ deadline, urgency }) => {
                      const isOverdue = urgency.effectiveStatus === 'Overdue';
                      const isDueSoon = urgency.effectiveStatus === 'Due Soon';

                      return (
                        <li
                          key={deadline.id}
                          className="px-6 py-3.5 hover:bg-slate-50/90 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                              <button
                                type="button"
                                onClick={() =>
                                  loanExists(deadline.loanId) && onSelectLoan(deadline.loanId)
                                }
                                className="hover:text-emerald-700 hover:underline text-left truncate cursor-pointer"
                              >
                                {deadline.borrowerName}
                              </button>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="font-mono text-xs text-slate-600 tabular-nums shrink-0">
                                {deadline.loanCode}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                              <span>
                                Installment {deadline.installmentNumber} of{' '}
                                {deadline.totalInstallments}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">
                                Due {formatDisplayDate(deadline.dueDate)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                            <div
                              className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${
                                isOverdue
                                  ? 'text-red-700'
                                  : isDueSoon
                                    ? 'text-amber-700'
                                    : 'text-slate-600'
                              }`}
                            >
                              {isOverdue ? (
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              ) : isDueSoon ? (
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>{urgency.label}</span>
                            </div>

                            <div className="text-right min-w-[92px]">
                              <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                                {formatCurrency(deadline.amountDue)}
                              </p>
                            </div>

                            <Button
                              size="sm"
                              variant="primary"
                              onPress={() => onRecordPayment(deadline)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium whitespace-nowrap shrink-0"
                            >
                              Record Payment
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* Recent Loan Transactions List */}
            {activeTab !== 'deadlines' && (
              <div>
                <div
                  className={`px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between ${
                    activeTab === 'all' ? 'border-t' : ''
                  }`}
                >
                  <span className="text-xs font-semibold text-slate-700">
                    Recent Loan Transactions
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {filteredTransactions.length} entries
                  </span>
                </div>

                {visibleTransactions.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm font-medium text-slate-800">
                      {normalizedQuery
                        ? 'No transactions match your search'
                        : 'No loan transactions recorded yet'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {normalizedQuery
                        ? 'Try another borrower name, loan code, or reference ID.'
                        : 'Originate a loan or record a repayment to populate the transaction ledger.'}
                    </p>
                    {!normalizedQuery && (
                      <Button
                        size="sm"
                        variant="primary"
                        onPress={onCreateLoanClick}
                        className="mt-3 bg-[#0B192C] text-white text-xs"
                      >
                        New Loan Application
                      </Button>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200" role="list">
                    {visibleTransactions.map((tx) => {
                      const isInflow = tx.direction === 'inflow';
                      const isSettled = tx.status === 'Settled';

                      return (
                        <li
                          key={tx.id}
                          className="px-6 py-3.5 hover:bg-slate-50/90 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div
                              className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                                isInflow
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                              aria-hidden="true"
                            >
                              {isInflow ? (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                <span className="truncate">
                                  {tx.type} · {tx.borrowerName}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <span className="font-mono tabular-nums">{tx.loanCode}</span>
                                <span aria-hidden="true">·</span>
                                <span>{tx.channel}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">{tx.referenceCode}</span>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">
                                  {formatDisplayDate(tx.occurredAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                            <div
                              className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${
                                isSettled ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {isSettled ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>{tx.status}</span>
                            </div>

                            <div className="text-right min-w-[100px]">
                              <p
                                className={`font-mono text-sm font-semibold tabular-nums ${
                                  isInflow ? 'text-emerald-700' : 'text-slate-900'
                                }`}
                              >
                                {isInflow ? '+' : '-'}
                                {formatCurrency(tx.amount)}
                              </p>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onPress={() => loanExists(tx.loanId) && onSelectLoan(tx.loanId)}
                              className="bg-white border-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap shrink-0"
                            >
                              View Loan
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* Footer link when truncated in Combined Overview */}
            {maxRowsPerSection &&
              activeTab === 'all' &&
              (pendingDeadlines.length > maxRowsPerSection ||
                filteredTransactions.length > maxRowsPerSection) && (
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Showing top {maxRowsPerSection} items per list
                  </span>
                  <div className="flex items-center gap-4">
                    {pendingDeadlines.length > maxRowsPerSection && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('deadlines')}
                        className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        View all {pendingDeadlines.length} deadlines
                      </button>
                    )}
                    {filteredTransactions.length > maxRowsPerSection && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('transactions')}
                        className="font-medium text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
                      >
                        View all {filteredTransactions.length} transactions
                      </button>
                    )}
                  </div>
                </div>
              )}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
