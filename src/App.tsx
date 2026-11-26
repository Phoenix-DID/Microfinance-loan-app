import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { Alert, Avatar, Button, Card, Separator } from '@heroui/react';
import {
  Building2,
  Calculator,
  CheckCircle2,
  FileCheck2,
  Fingerprint,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { BiometricAuthModule } from './components/BiometricAuthModule';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoanDetailDrawer } from './components/LoanDetailDrawer';
import { LoanOriginationView } from './components/LoanOriginationView';
import { LoanPortfolioView } from './components/LoanPortfolioView';
import { LoginScreen } from './components/LoginScreen';
import { RecentActivityWidget } from './components/RecentActivityWidget';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { auth } from './firebase';
import {
  approveAndDisburseLoan,
  createLoanApplication,
  ensureUserProfileAndSeed,
  recordDeadlinePayment,
  recordDirectLoanRepayment,
  subscribeToDeadlines,
  subscribeToLoans,
  subscribeToTransactions,
} from './services/loanService';
import type {
  LoanAccount,
  LoanTransaction,
  NewLoanInput,
  PaymentDeadline,
  UserProfile,
} from './types';
import {
  formatCompactCurrency,
  formatCurrency,
  resolveDeadlineUrgency,
} from './utils/formatters';
import type { BiometricModality } from './utils/webauthn';

type ActiveSection = 'overview' | 'portfolio' | 'origination' | 'ledger' | 'security';

const OFFICER_AVATAR_IMAGE = '/src/assets/images/avatar_bank_officer_1795685166880.jpg';

function MeridianPortal() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [transactions, setTransactions] = useState<LoanTransaction[]>([]);
  const [deadlines, setDeadlines] = useState<PaymentDeadline[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [syncError, setSyncError] = useState<Error | null>(null);

  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [paymentModalDeadline, setPaymentModalDeadline] = useState<PaymentDeadline | null>(null);
  const [isDeskLocked, setIsDeskLocked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (syncError) {
    throw syncError;
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setProfile(null);
        setLoans([]);
        setTransactions([]);
        setDeadlines([]);
        setIsDeskLocked(false);
        setDataLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setDataLoading(true);

    let unsubLoans: (() => void) | undefined;
    let unsubTx: (() => void) | undefined;
    let unsubDeadlines: (() => void) | undefined;

    ensureUserProfileAndSeed(user)
      .then((loadedProfile) => {
        if (!active) return;
        setProfile(loadedProfile);

        let loansLoaded = false;
        let txLoaded = false;
        let dlLoaded = false;
        const markReady = () => {
          if (loansLoaded && txLoaded && dlLoaded && active) {
            setDataLoading(false);
          }
        };

        unsubLoans = subscribeToLoans(
          user.uid,
          (items) => {
            if (!active) return;
            setLoans(items);
            loansLoaded = true;
            markReady();
          },
          (err) => active && setSyncError(err)
        );

        unsubTx = subscribeToTransactions(
          user.uid,
          (items) => {
            if (!active) return;
            setTransactions(items);
            txLoaded = true;
            markReady();
          },
          (err) => active && setSyncError(err)
        );

        unsubDeadlines = subscribeToDeadlines(
          user.uid,
          (items) => {
            if (!active) return;
            setDeadlines(items);
            dlLoaded = true;
            markReady();
          },
          (err) => active && setSyncError(err)
        );
      })
      .catch((err) => {
        if (active) setSyncError(err instanceof Error ? err : new Error(String(err)));
      });

    return () => {
      active = false;
      unsubLoans?.();
      unsubTx?.();
      unsubDeadlines?.();
    };
  }, [user]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const metrics = useMemo(() => {
    const activeLoans = loans.filter((l) => l.status === 'Active' || l.status === 'Overdue');
    const outstandingExposure = activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0);
    const totalCollected = loans.reduce((sum, l) => sum + l.paidAmount, 0);

    const openDeadlines = deadlines.filter((d) => d.status !== 'Paid');
    const overdueDeadlines = openDeadlines.filter(
      (d) => resolveDeadlineUrgency(d.dueDate, d.status).effectiveStatus === 'Overdue'
    );
    const overdueAmount = overdueDeadlines.reduce((sum, d) => sum + d.amountDue, 0);
    const upcomingTotal = openDeadlines.reduce((sum, d) => sum + d.amountDue, 0);
    const pendingReviewLoans = loans.filter((l) => l.status === 'Pending Review');

    return {
      activeCount: activeLoans.length,
      outstandingExposure,
      totalCollected,
      openDeadlinesCount: openDeadlines.length,
      upcomingTotal,
      overdueCount: overdueDeadlines.length,
      overdueAmount,
      pendingReviewLoans,
    };
  }, [loans, deadlines]);

  const selectedLoan = useMemo(
    () => loans.find((l) => l.id === selectedLoanId) || null,
    [loans, selectedLoanId]
  );

  const paymentModalLoan = useMemo(() => {
    if (!paymentModalDeadline) return null;
    return loans.find((l) => l.id === paymentModalDeadline.loanId) || null;
  }, [loans, paymentModalDeadline]);

  const showConfirmation = (msg: string) => {
    setToastMessage(msg);
  };

  const handleCreateLoan = async (input: NewLoanInput) => {
    if (!user) return;
    await createLoanApplication(user.uid, input);
    setActiveSection('overview');
    showConfirmation(
      input.disburseImmediately
        ? `Facility originated and disbursed for ${input.borrowerName}.`
        : `Loan application for ${input.borrowerName} submitted for underwriting.`
    );
  };

  const handleApproveLoan = async (loan: LoanAccount) => {
    if (!user) return;
    await approveAndDisburseLoan(user.uid, loan);
    showConfirmation(`Facility ${loan.loanCode} approved and disbursed.`);
  };

  const handleConfirmDeadlinePayment = async (
    deadline: PaymentDeadline,
    loan: LoanAccount,
    channel: string,
    notes: string
  ) => {
    if (!user) return;
    const loanDeadlines = deadlines.filter((d) => d.loanId === loan.id);
    await recordDeadlinePayment(user.uid, loan, deadline, loanDeadlines, channel, notes);
    showConfirmation(
      `Recorded ${formatCurrency(deadline.amountDue)} settlement for ${loan.loanCode}.`
    );
  };

  const handleRecordDirectPayment = async (
    loan: LoanAccount,
    amount: number,
    channel: string,
    notes: string
  ) => {
    if (!user) return;
    await recordDirectLoanRepayment(user.uid, loan, amount, channel, notes);
    showConfirmation(`Posted ${formatCurrency(amount)} repayment to ${loan.loanCode}.`);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleDeskUnlocked = (modality: BiometricModality) => {
    setIsDeskLocked(false);
    showConfirmation(
      `Desk unlocked via ${modality === 'face_id' ? 'Face ID' : 'Fingerprint'} verification.`
    );
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-md bg-[#0B192C] mx-auto animate-pulse" />
          <p className="text-xs font-medium text-slate-600">Initializing corporate workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const sectionTitleMap: Record<ActiveSection, string> = {
    overview: 'Executive Overview',
    portfolio: 'Loan Portfolio',
    origination: 'Loan Origination',
    ledger: 'Transactions & Deadlines',
    security: 'Biometric Security',
  };

  const navItems: { id: ActiveSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
    { id: 'portfolio', label: 'Loan Portfolio', icon: <Wallet className="w-4 h-4 shrink-0" /> },
    { id: 'origination', label: 'Originate Loan', icon: <Calculator className="w-4 h-4 shrink-0" /> },
    { id: 'ledger', label: 'Ledger & Schedule', icon: <ListChecks className="w-4 h-4 shrink-0" /> },
    { id: 'security', label: 'Biometric Security', icon: <Fingerprint className="w-4 h-4 shrink-0" /> },
  ];

  const officerName = profile?.displayName || user.displayName || 'Portfolio Officer';
  const officerEmail = profile?.email || user.email || '';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Corporate Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#0B192C] text-slate-200 border-r border-slate-800">
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80 shrink-0">
          <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-sm font-semibold tracking-tight text-white whitespace-nowrap">
            Meridian Microfinance
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Primary sidebar navigation">
          {navItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar size="sm" className="shrink-0">
              <Avatar.Image
                src={OFFICER_AVATAR_IMAGE}
                alt={officerName}
                referrerPolicy="no-referrer"
              />
              <Avatar.Fallback className="bg-slate-700 text-white text-xs">
                {officerName.slice(0, 2).toUpperCase()}
              </Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{officerName}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {profile?.branchName || 'Central Commercial Desk'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onPress={() => setIsDeskLocked(true)}
              className="h-8 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Desk</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onPress={() => void handleSignOut()}
              className="h-8 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 max-w-[80vw] bg-[#0B192C] text-white flex flex-col h-full z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
              <span className="font-display text-sm font-semibold">Meridian Microfinance</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md cursor-pointer ${
                    activeSection === item.id
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-800 space-y-2">
              <Button
                fullWidth
                size="sm"
                variant="outline"
                onPress={() => {
                  setMobileMenuOpen(false);
                  setIsDeskLocked(true);
                }}
                className="bg-slate-900 border-slate-700 text-white text-xs"
              >
                Lock Desk
              </Button>
              <Button
                fullWidth
                size="sm"
                variant="outline"
                onPress={() => void handleSignOut()}
                className="bg-slate-900 border-slate-700 text-white text-xs"
              >
                Sign Out
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb/Section Title — Primary CTA */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 lg:px-8 flex items-center justify-between gap-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
                Commercial Desk
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-display text-base font-semibold text-slate-900 truncate">
                {sectionTitleMap[activeSection]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              size="sm"
              variant="primary"
              onPress={() => setActiveSection('origination')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>New Loan Application</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-[1360px] w-full mx-auto space-y-6">
          {toastMessage && (
            <Alert status="success" className="bg-emerald-50 border border-emerald-200 rounded-lg">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title className="text-xs font-semibold text-emerald-900">
                  Ledger Updated
                </Alert.Title>
                <Alert.Description className="text-xs text-emerald-800">
                  {toastMessage}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {activeSection === 'overview' && (
            <>
              {/* 4-Column Corporate KPI Strip */}
              <section
                aria-label="Portfolio summary metrics"
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
              >
                <Card className="bg-white border border-slate-200 rounded-lg shadow-none p-5">
                  <p className="text-xs font-medium text-slate-500">Outstanding Portfolio</p>
                  <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-2">
                    {formatCompactCurrency(metrics.outstandingExposure)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
                    Across {metrics.activeCount} active facilities
                  </p>
                </Card>

                <Card className="bg-white border border-slate-200 rounded-lg shadow-none p-5">
                  <p className="text-xs font-medium text-slate-500">Collected Repayments</p>
                  <p className="font-mono text-2xl font-semibold text-emerald-700 tabular-nums mt-2">
                    {formatCompactCurrency(metrics.totalCollected)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
                    {transactions.filter((t) => t.direction === 'inflow').length} settled inflows
                  </p>
                </Card>

                <Card className="bg-white border border-slate-200 rounded-lg shadow-none p-5">
                  <p className="text-xs font-medium text-slate-500">Pending Payment Deadlines</p>
                  <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-2">
                    {formatCurrency(metrics.upcomingTotal)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
                    {metrics.openDeadlinesCount} scheduled installments
                  </p>
                </Card>

                <Card className="bg-white border border-slate-200 rounded-lg shadow-none p-5">
                  <p className="text-xs font-medium text-slate-500">Overdue Exposure</p>
                  <p
                    className={`font-mono text-2xl font-semibold tabular-nums mt-2 ${
                      metrics.overdueAmount > 0 ? 'text-red-700' : 'text-slate-900'
                    }`}
                  >
                    {formatCurrency(metrics.overdueAmount)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
                    {metrics.overdueCount} past-due installments
                  </p>
                </Card>
              </section>

              {/* Pending Underwriting Bar (when pending loans exist) */}
              {metrics.pendingReviewLoans.length > 0 && (
                <Card className="bg-white border border-slate-200 rounded-lg shadow-none p-0 overflow-hidden">
                  <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">
                      Underwriting Queue ({metrics.pendingReviewLoans.length} pending approval)
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSection('portfolio')}
                      className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
                    >
                      Open Portfolio Register
                    </button>
                  </div>
                  <ul className="divide-y divide-slate-200">
                    {metrics.pendingReviewLoans.map((loan) => (
                      <li
                        key={loan.id}
                        className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="text-xs">
                          <span className="font-semibold text-slate-900">{loan.borrowerName}</span>
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span className="text-slate-600">{loan.businessName}</span>
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span className="font-mono text-slate-600 tabular-nums">
                            {loan.loanCode} · {formatCurrency(loan.principalAmount)} at{' '}
                            {loan.interestRateApr}% APR
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onPress={() => setSelectedLoanId(loan.id)}
                            className="bg-white border-slate-200 text-slate-700 text-xs"
                          >
                            Review
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onPress={() => void handleApproveLoan(loan)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Approve &amp; Disburse</span>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Focal Anchor: Recent Loan Transactions & Pending Payment Deadlines List Widget */}
              <RecentActivityWidget
                loans={loans}
                transactions={transactions}
                deadlines={deadlines}
                loading={dataLoading}
                maxRowsPerSection={5}
                onSelectLoan={(id) => setSelectedLoanId(id)}
                onRecordPayment={(dl) => setPaymentModalDeadline(dl)}
                onCreateLoanClick={() => setActiveSection('origination')}
              />
            </>
          )}

          {activeSection === 'portfolio' && (
            <LoanPortfolioView
              loans={loans}
              loading={dataLoading}
              onSelectLoan={(id) => setSelectedLoanId(id)}
              onApproveLoan={handleApproveLoan}
              onCreateLoanClick={() => setActiveSection('origination')}
            />
          )}

          {activeSection === 'origination' && (
            <LoanOriginationView
              onSubmitLoan={handleCreateLoan}
              onCancel={() => setActiveSection('overview')}
            />
          )}

          {activeSection === 'ledger' && (
            <RecentActivityWidget
              loans={loans}
              transactions={transactions}
              deadlines={deadlines}
              loading={dataLoading}
              title="Complete Transaction Ledger & Payment Deadlines"
              subtitle="Full chronological history of disbursements, settlements, and scheduled payment deadlines"
              onSelectLoan={(id) => setSelectedLoanId(id)}
              onRecordPayment={(dl) => setPaymentModalDeadline(dl)}
              onCreateLoanClick={() => setActiveSection('origination')}
            />
          )}

          {activeSection === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <Card className="lg:col-span-7 bg-white border border-slate-200 rounded-lg shadow-none p-6 space-y-5">
                <div className="border-b border-slate-200 pb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-base font-semibold text-slate-900">
                      Biometric Authentication &amp; Passkey Enrollment
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Configure Face ID and Fingerprint verification for officer login and desk lock
                    </p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                </div>

                <BiometricAuthModule
                  mode="settings"
                  userLabel={officerEmail}
                  onVerified={(modality) =>
                    showConfirmation(
                      `${modality === 'face_id' ? 'Face ID' : 'Fingerprint'} credential verified.`
                    )
                  }
                />

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Test Session Desk Lock</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lock the active portfolio workspace and require biometric re-verification to
                      resume.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onPress={() => setIsDeskLocked(true)}
                    className="bg-[#0B192C] text-white text-xs font-medium whitespace-nowrap shrink-0"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Desk Now</span>
                  </Button>
                </div>
              </Card>

              <Card className="lg:col-span-5 bg-white border border-slate-200 rounded-lg shadow-none p-6 space-y-4">
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Authenticated Officer Session
                </h3>
                <Separator />
                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Officer Name</dt>
                    <dd className="font-medium text-slate-900 text-right">{officerName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Workspace Email</dt>
                    <dd className="font-mono text-slate-900 text-right">{officerEmail}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Assigned Desk</dt>
                    <dd className="font-medium text-slate-900 text-right">
                      {profile?.branchName || 'Central Commercial Desk'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Role Authorization</dt>
                    <dd className="inline-flex items-center gap-1 font-medium text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{profile?.role === 'admin' ? 'Branch Administrator' : 'Loan Officer'}</span>
                    </dd>
                  </div>
                </dl>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Loan Detail Slide-Over Drawer */}
      <LoanDetailDrawer
        loan={selectedLoan}
        transactions={transactions}
        deadlines={deadlines}
        onClose={() => setSelectedLoanId(null)}
        onApproveLoan={handleApproveLoan}
        onRecordDeadlinePayment={(dl) => setPaymentModalDeadline(dl)}
        onRecordDirectPayment={handleRecordDirectPayment}
      />

      {/* Payment Confirmation Modal */}
      <RecordPaymentModal
        deadline={paymentModalDeadline}
        loan={paymentModalLoan}
        onClose={() => setPaymentModalDeadline(null)}
        onConfirm={handleConfirmDeadlinePayment}
      />

      {/* Biometric Desk Lock Overlay */}
      {isDeskLocked && (
        <div
          className="fixed inset-0 z-50 bg-[#0B192C]/95 backdrop-blur-xs flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Biometric desk lock screen"
        >
          <Card className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[#0B192C] text-white flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Corporate Desk Locked
                </h2>
                <p className="text-xs text-slate-500">
                  Verify identity with Face ID or Fingerprint to resume
                </p>
              </div>
            </div>

            <BiometricAuthModule
              mode="unlock"
              userLabel={officerEmail}
              onVerified={handleDeskUnlocked}
            />

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-500 truncate">{officerEmail}</span>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="font-medium text-slate-700 hover:text-red-700 cursor-pointer whitespace-nowrap"
              >
                Sign out instead
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MeridianPortal />
    </ErrorBoundary>
  );
}
