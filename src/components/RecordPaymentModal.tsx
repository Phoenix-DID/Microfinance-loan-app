import React, { useState } from 'react';
import { Button, Input, Modal } from '@heroui/react';
import { CheckCircle2 } from 'lucide-react';
import type { LoanAccount, PaymentDeadline } from '../types';
import { formatCurrency, formatDisplayDate } from '../utils/formatters';

interface RecordPaymentModalProps {
  deadline: PaymentDeadline | null;
  loan: LoanAccount | null;
  onClose: () => void;
  onConfirm: (
    deadline: PaymentDeadline,
    loan: LoanAccount,
    channel: string,
    notes: string
  ) => Promise<void>;
}

const CHANNELS = ['ACH Transfer', 'Wire Clearing', 'Branch Counter', 'Mobile Treasury'];

export function RecordPaymentModal({
  deadline,
  loan,
  onClose,
  onConfirm,
}: RecordPaymentModalProps) {
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOpen = Boolean(deadline && loan);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadline || !loan) return;
    setIsSubmitting(true);
    try {
      await onConfirm(deadline, loan, channel, notes);
      setNotes('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop className="bg-slate-950/45">
        <Modal.Container size="md" placement="center">
          <Modal.Dialog className="bg-white border border-slate-200 rounded-lg shadow-lg p-0 overflow-hidden">
            {deadline && loan && (
              <form onSubmit={handleSubmit}>
                <Modal.Header className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
                  <div>
                    <Modal.Heading className="font-display text-base font-semibold text-slate-900">
                      Record Installment Payment
                    </Modal.Heading>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {deadline.borrowerName} · {deadline.loanCode}
                    </p>
                  </div>
                  <Modal.CloseTrigger />
                </Modal.Header>

                <Modal.Body className="p-6 space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">
                        Installment #{deadline.installmentNumber} of {deadline.totalInstallments}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                        Scheduled Due: {formatDisplayDate(deadline.dueDate)}
                      </p>
                    </div>
                    <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(deadline.amountDue)}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="paymentChannel"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Settlement Channel
                    </label>
                    <select
                      id="paymentChannel"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                    >
                      {CHANNELS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="paymentNotes"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Settlement Reference / Notes
                    </label>
                    <Input
                      id="paymentNotes"
                      type="text"
                      maxLength={240}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={`Installment #${deadline.installmentNumber} cleared`}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900"
                    />
                  </div>
                </Modal.Body>

                <Modal.Footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={onClose}
                    className="bg-white border-slate-200 text-slate-700 text-xs font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    isDisabled={isSubmitting}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Recording...' : 'Confirm Settlement'}</span>
                  </Button>
                </Modal.Footer>
              </form>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
