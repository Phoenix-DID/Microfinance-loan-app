import React, { useMemo, useState } from 'react';
import { Button, Drawer, Input, ProgressBar, Tabs } from '@heroui/react';
import { AlertCircle, CheckCircle2, Clock, FileCheck2 } from 'lucide-react';
import type { LoanAccount, LoanTransaction, PaymentDeadline } from '../types';
import {
  formatCurrency,
  formatDisplayDate,
  resolveDeadlineUrgency,
} from '../utils/formatters';

interface LoanDetailDrawerProps {
  loan: LoanAccount | null;
  transactions: LoanTransaction[];
  deadlines: PaymentDeadline[];
  onClose: () => void;
  onApproveLoan: (loan: LoanAccount) => Promise<void>;
  onRecordDeadlinePayment: (deadline: PaymentDeadline) => void;
  onRecordDirectPayment: (
    loan: LoanAccount,
    amount: number,
    channel: string,
    notes: string
  ) => Promise<void>;
}

export function LoanDetailDrawer({
  loan,
  transactions,
  deadlines,
  onClose,
  onApproveLoan,
  onRecordDeadlinePayment,
  onRecordDirectPayment,
}: LoanDetailDrawerProps) {
  const [drawerTab, setDrawerTab] = useState<'schedule' | 'transactions'>('schedule');
  const [approving, setApproving] = useState(false);
  const [showCustomPay, setShowCustomPay] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customChannel, setCustomChannel] = useState('ACH Transfer');
  const [customNotes, setCustomNotes] = useState('');
  const [submittingCustom, setSubmittingCustom] = useState(false);

  const loanDeadlines = useMemo(
    () =>
      loan
        ? deadlines
            .filter((d) => d.loanId === loan.id)
            .sort((a, b) => a.installmentNumber - b.installmentNumber)
        : [],
    [deadlines, loan]
  );

  const loanTransactions = useMemo(
    () =>
      loan
        ? transactions
            .filter((tx) => tx.loanId === loan.id)
            .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        : [],
    [transactions, loan]
  );

  const progressPct =
    loan && loan.totalRepayable > 0
      ? Math.min(100, Math.round((loan.paidAmount / loan.totalRepayable) * 100))
      : 0;

  const handleApprove = async () => {
    if (!loan) return;
    setApproving(true);
    try {
      await onApproveLoan(loan);
    } finally {
      setApproving(false);
    }
  };

  const handleDirectPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan) return;
    const numeric = Number(customAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    setSubmittingCustom(true);
    try {
      await onRecordDirectPayment(loan, numeric, customChannel, customNotes);
      setShowCustomPay(false);
      setCustomAmount('');
      setCustomNotes('');
    } finally {
      setSubmittingCustom(false);
    }
  };

  return (
    <Drawer isOpen={Boolean(loan)} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Backdrop className="bg-slate-950/40">
        <Drawer.Content placement="right" className="w-full max-w-2xl bg-white border-l border-slate-200">
          <Drawer.Dialog className="h-full flex flex-col p-0">
            {loan && (
              <>
                <Drawer.Header className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-800 tabular-nums">
                        {loan.loanCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{loan.productType}</span>
                      <span aria-hidden="true">·</span>
                      <span>{loan.sector}</span>
                    </div>
                    <Drawer.Heading className="font-display text-xl font-semibold text-slate-900 mt-1">
                      {loan.borrowerName}
                    </Drawer.Heading>
                    <p className="text-xs text-slate-500 mt-0.5">{loan.businessName}</p>
                  </div>
                  <Drawer.CloseTrigger />
                </Drawer.Header>

                <Drawer.Body className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border border-slate-200 rounded-lg p-4 bg-slate-50/70">
                    <div>
                      <p className="text-xs text-slate-500">Principal</p>
                      <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums mt-1">
                        {formatCurrency(loan.principalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Repaid to Date</p>
                      <p className="font-mono text-sm font-semibold text-emerald-700 tabular-nums mt-1">
                        {formatCurrency(loan.paidAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Remaining</p>
                      <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums mt-1">
                        {formatCurrency(loan.remainingBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Terms</p>
                      <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums mt-1">
                        {loan.interestRateApr}% · {loan.termMonths}m
                      </p>
                    </div>
                  </div>

                  {/* HeroUI ProgressBar */}
                  <ProgressBar value={progressPct} color="success" aria-label="Repayment progress">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-700">Repayment Progress</span>
                      <ProgressBar.Output className="font-mono text-slate-600 tabular-nums">
                        {progressPct}% of {formatCurrency(loan.totalRepayable)}
                      </ProgressBar.Output>
                    </div>
                    <ProgressBar.Track className="h-2 bg-slate-100 rounded-full">
                      <ProgressBar.Fill className="bg-emerald-700 rounded-full" />
                    </ProgressBar.Track>
                  </ProgressBar>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-slate-200">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span className="text-slate-500">Status:</span>
                      <span
                        className={`inline-flex items-center gap-1.5 ${
                          loan.status === 'Overdue'
                            ? 'text-red-700'
                            : loan.status === 'Pending Review'
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }`}
                      >
                        {loan.status === 'Overdue' ? (
                          <AlertCircle className="w-3.5 h-3.5" />
                        ) : loan.status === 'Pending Review' ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{loan.status}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {loan.status === 'Pending Review' && (
                        <Button
                          size="sm"
                          variant="primary"
                          isDisabled={approving}
                          onPress={() => void handleApprove()}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
                        >
                          <FileCheck2 className="w-4 h-4" />
                          <span>{approving ? 'Disbursing...' : 'Approve & Disburse'}</span>
                        </Button>
                      )}

                      {(loan.status === 'Active' || loan.status === 'Overdue') && (
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => {
                            setCustomAmount(
                              String(Math.min(loan.remainingBalance, loan.installmentAmount))
                            );
                            setShowCustomPay((prev) => !prev);
                          }}
                          className="bg-[#0B192C] hover:bg-slate-800 text-white text-xs font-medium"
                        >
                          {showCustomPay ? 'Hide Repayment Form' : 'Record Ad-Hoc Repayment'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {showCustomPay && (
                    <form
                      onSubmit={handleDirectPaySubmit}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
                    >
                      <p className="text-xs font-semibold text-slate-900">
                        Record Direct Loan Repayment
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Amount (USD)</label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={loan.remainingBalance}
                            required
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            className="w-full px-3 py-1.5 font-mono text-sm bg-white border border-slate-200 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">
                            Clearing Channel
                          </label>
                          <select
                            value={customChannel}
                            onChange={(e) => setCustomChannel(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md"
                          >
                            <option value="ACH Transfer">ACH Transfer</option>
                            <option value="Wire Clearing">Wire Clearing</option>
                            <option value="Branch Counter">Branch Counter</option>
                            <option value="Mobile Treasury">Mobile Treasury</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Audit Note</label>
                        <Input
                          type="text"
                          maxLength={240}
                          value={customNotes}
                          onChange={(e) => setCustomNotes(e.target.value)}
                          placeholder="Optional teller or reference note"
                          className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() => setShowCustomPay(false)}
                          className="bg-white border-slate-200 text-slate-700 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          variant="primary"
                          isDisabled={submittingCustom}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
                        >
                          {submittingCustom ? 'Posting...' : 'Post Repayment'}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* HeroUI Tabs: Schedule vs Ledger */}
                  <Tabs
                    selectedKey={drawerTab}
                    onSelectionChange={(k) => setDrawerTab(k as 'schedule' | 'transactions')}
                  >
                    <Tabs.ListContainer>
                      <Tabs.List
                        aria-label="Loan facility detail tabs"
                        className="bg-slate-100 border border-slate-200 p-1 rounded-md mb-4"
                      >
                        <Tabs.Tab id="schedule" className="px-3 py-1.5 text-xs font-medium rounded">
                          Payment Schedule ({loanDeadlines.length})
                          <Tabs.Indicator className="bg-white rounded shadow-xs" />
                        </Tabs.Tab>
                        <Tabs.Tab
                          id="transactions"
                          className="px-3 py-1.5 text-xs font-medium rounded"
                        >
                          Transaction History ({loanTransactions.length})
                          <Tabs.Indicator className="bg-white rounded shadow-xs" />
                        </Tabs.Tab>
                      </Tabs.List>
                    </Tabs.ListContainer>

                    <Tabs.Panel id="schedule" className="p-0">
                      {loanDeadlines.length === 0 ? (
                        <div className="p-6 border border-slate-200 rounded-lg text-center text-xs text-slate-500">
                          {loan.status === 'Pending Review'
                            ? 'Payment deadlines will be generated once this facility is approved and disbursed.'
                            : 'No installment deadlines on file.'}
                        </div>
                      ) : (
                        <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                          {loanDeadlines.map((dl) => {
                            const urgency = resolveDeadlineUrgency(dl.dueDate, dl.status);
                            const isPaid = dl.status === 'Paid';
                            return (
                              <li
                                key={dl.id}
                                className="px-4 py-3 flex items-center justify-between gap-4 text-xs"
                              >
                                <div>
                                  <p className="font-medium text-slate-900">
                                    Installment #{dl.installmentNumber} of {dl.totalInstallments}
                                  </p>
                                  <p className="text-slate-500 mt-0.5 tabular-nums">
                                    Due {formatDisplayDate(dl.dueDate)}
                                    {dl.paidAt ? ` · Paid ${formatDisplayDate(dl.paidAt)}` : ''}
                                  </p>
                                </div>

                                <div className="flex items-center gap-4 shrink-0">
                                  <span
                                    className={`font-medium ${
                                      isPaid
                                        ? 'text-emerald-700'
                                        : urgency.effectiveStatus === 'Overdue'
                                          ? 'text-red-700'
                                          : urgency.effectiveStatus === 'Due Soon'
                                            ? 'text-amber-700'
                                            : 'text-slate-600'
                                    }`}
                                  >
                                    {urgency.label}
                                  </span>
                                  <span className="font-mono font-semibold text-slate-900 tabular-nums min-w-[76px] text-right">
                                    {formatCurrency(dl.amountDue)}
                                  </span>
                                  {!isPaid && (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onPress={() => onRecordDeadlinePayment(dl)}
                                      className="h-7 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
                                    >
                                      Pay
                                    </Button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </Tabs.Panel>

                    <Tabs.Panel id="transactions" className="p-0">
                      {loanTransactions.length === 0 ? (
                        <div className="p-6 border border-slate-200 rounded-lg text-center text-xs text-slate-500">
                          No ledger entries posted for this facility yet.
                        </div>
                      ) : (
                        <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                          {loanTransactions.map((tx) => (
                            <li
                              key={tx.id}
                              className="px-4 py-3 flex items-center justify-between gap-4 text-xs"
                            >
                              <div>
                                <p className="font-medium text-slate-900">
                                  {tx.type} · {tx.channel}
                                </p>
                                <p className="text-slate-500 mt-0.5">
                                  <span className="font-mono">{tx.referenceCode}</span> ·{' '}
                                  {formatDisplayDate(tx.occurredAt)}
                                </p>
                                {tx.notes && <p className="text-slate-500 mt-1">{tx.notes}</p>}
                              </div>
                              <span
                                className={`font-mono font-semibold tabular-nums shrink-0 ${
                                  tx.direction === 'inflow' ? 'text-emerald-700' : 'text-slate-900'
                                }`}
                              >
                                {tx.direction === 'inflow' ? '+' : '-'}
                                {formatCurrency(tx.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Tabs.Panel>
                  </Tabs>
                </Drawer.Body>
              </>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
