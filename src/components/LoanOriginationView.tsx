import React, { useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Separator } from '@heroui/react';
import { Calculator, CheckCircle2 } from 'lucide-react';
import { BLUEPRINT_LIMITS, NewLoanInput, RepaymentCadence } from '../types';
import { calculateLoanTerms, formatCurrency, formatDisplayDate } from '../utils/formatters';

interface LoanOriginationViewProps {
  onSubmitLoan: (input: NewLoanInput) => Promise<void>;
  onCancel: () => void;
}

const SECTORS = [
  'Agri-Supply',
  'Retail Trade',
  'Logistics',
  'Light Manufacturing',
  'Healthcare Services',
  'Food Processing',
];
const PRODUCTS = [
  'Working Capital',
  'Inventory Bridge',
  'Equipment Micro-Lease',
  'Seasonal Credit',
];
const CADENCES: RepaymentCadence[] = ['Monthly', 'Bi-weekly', 'Weekly'];

export function LoanOriginationView({ onSubmitLoan, onCancel }: LoanOriginationViewProps) {
  const [borrowerName, setBorrowerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [sector, setSector] = useState(SECTORS[0]);
  const [productType, setProductType] = useState(PRODUCTS[0]);
  const [principalAmount, setPrincipalAmount] = useState(12000);
  const [interestRateApr, setInterestRateApr] = useState(12.5);
  const [termMonths, setTermMonths] = useState(12);
  const [repaymentCadence, setRepaymentCadence] = useState<RepaymentCadence>('Monthly');
  const [disburseImmediately, setDisburseImmediately] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const summary = useMemo(
    () => calculateLoanTerms(principalAmount, interestRateApr, termMonths, repaymentCadence),
    [principalAmount, interestRateApr, termMonths, repaymentCadence]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (borrowerName.trim().length < BLUEPRINT_LIMITS.NAME_MIN_LEN) {
      setValidationError('Enter the primary borrower full name (at least 2 characters).');
      return;
    }
    if (businessName.trim().length < BLUEPRINT_LIMITS.NAME_MIN_LEN) {
      setValidationError('Enter the registered enterprise or business name.');
      return;
    }
    if (
      principalAmount < BLUEPRINT_LIMITS.PRINCIPAL_MIN ||
      principalAmount > BLUEPRINT_LIMITS.PRINCIPAL_MAX
    ) {
      setValidationError('Principal must be between $100 and $10,000,000.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitLoan({
        borrowerName,
        businessName,
        sector,
        productType,
        principalAmount,
        interestRateApr,
        termMonths,
        repaymentCadence,
        disburseImmediately,
      });
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Unable to originate loan facility.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Form Card */}
      <Card className="lg:col-span-7 bg-white border border-slate-200 rounded-lg shadow-none p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="font-display text-base font-semibold text-slate-900 tracking-tight">
              Originate Microfinance Facility
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Configure borrower underwriting parameters, repayment cadence, and disbursement timing
            </p>
          </div>

          {validationError && (
            <Alert status="danger" className="rounded-md border border-red-200 bg-red-50">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description className="text-xs text-red-800">
                  {validationError}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="borrowerName"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Borrower Full Name
              </label>
              <Input
                id="borrowerName"
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.NAME_MAX_LEN}
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                placeholder="e.g. Samuel Okafor"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="businessName"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Enterprise / Business Name
              </label>
              <Input
                id="businessName"
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.BUSINESS_MAX_LEN}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Okafor Grain Mills"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sector" className="block text-xs font-medium text-slate-700 mb-1.5">
                Industry Sector
              </label>
              <select
                id="sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                {SECTORS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="productType"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Credit Facility Product
              </label>
              <select
                id="productType"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                {PRODUCTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="principalAmount"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Principal (USD)
              </label>
              <Input
                id="principalAmount"
                type="number"
                min={100}
                max={10000000}
                step={100}
                required
                value={String(principalAmount)}
                onChange={(e) => setPrincipalAmount(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono text-sm tabular-nums bg-white border border-slate-200 rounded-md text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="interestRateApr"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Interest Rate (% APR)
              </label>
              <Input
                id="interestRateApr"
                type="number"
                min={0}
                max={100}
                step={0.25}
                required
                value={String(interestRateApr)}
                onChange={(e) => setInterestRateApr(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono text-sm tabular-nums bg-white border border-slate-200 rounded-md text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="termMonths"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Tenor (Months)
              </label>
              <Input
                id="termMonths"
                type="number"
                min={1}
                max={60}
                required
                value={String(termMonths)}
                onChange={(e) => setTermMonths(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono text-sm tabular-nums bg-white border border-slate-200 rounded-md text-slate-900"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 mb-2">
              Repayment Cadence
            </span>
            <div className="grid grid-cols-3 gap-2">
              {CADENCES.map((cadence) => (
                <Button
                  key={cadence}
                  size="sm"
                  variant={repaymentCadence === cadence ? 'primary' : 'outline'}
                  onPress={() => setRepaymentCadence(cadence)}
                  className={`text-xs font-medium ${
                    repaymentCadence === cadence
                      ? 'bg-[#0B192C] text-white'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  {cadence}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={disburseImmediately}
                onChange={(e) => setDisburseImmediately(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
              />
              <div>
                <span className="block text-xs font-semibold text-slate-900">
                  Approve &amp; Disburse Immediately
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Posts the disbursement ledger transaction and generates scheduled payment deadlines
                  immediately. Uncheck to place in Pending Review.
                </span>
              </div>
            </label>
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-3">
            <Button
              size="sm"
              variant="outline"
              onPress={onCancel}
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
              <span>
                {isSubmitting
                  ? 'Processing Facility...'
                  : disburseImmediately
                    ? 'Originate & Disburse Facility'
                    : 'Submit for Underwriting'}
              </span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Right Live Underwriting Summary */}
      <Card className="lg:col-span-5 bg-white border border-slate-200 rounded-lg shadow-none p-6 space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
          <Calculator className="w-4 h-4 text-emerald-700" />
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Underwriting &amp; Amortization Preview
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500">Installment Amount</p>
            <p className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-1">
              {formatCurrency(summary.installmentAmount)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{repaymentCadence} obligation</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Repayable</p>
            <p className="font-mono text-xl font-semibold text-emerald-700 tabular-nums mt-1">
              {formatCurrency(summary.totalRepayable)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              {summary.totalInstallments} installments
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Principal Disbursed</span>
            <span className="font-mono font-medium text-slate-900 tabular-nums">
              {formatCurrency(principalAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">
              Projected Interest Yield ({interestRateApr}% APR)
            </span>
            <span className="font-mono font-medium text-slate-900 tabular-nums">
              {formatCurrency(summary.totalInterest)}
            </span>
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold text-slate-800 mb-3">
            First 4 Scheduled Deadlines
          </p>
          <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md">
            {summary.schedulePreview.slice(0, 4).map((item) => (
              <li
                key={item.installmentNumber}
                className="px-3.5 py-2.5 flex items-center justify-between text-xs"
              >
                <span className="text-slate-600 tabular-nums">
                  #{item.installmentNumber} · {formatDisplayDate(item.dueDate)}
                </span>
                <span className="font-mono font-medium text-slate-900 tabular-nums">
                  {formatCurrency(item.amountDue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
