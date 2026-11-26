import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { Alert, Button, Card, Separator } from '@heroui/react';
import { ArrowRight, Building2, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import type { BiometricModality } from '../utils/webauthn';
import { BiometricAuthModule } from './BiometricAuthModule';

const CORPORATE_ATRIUM_IMAGE = '/src/assets/images/login_corporate_atrium_1795685166533.jpg';

interface LoginScreenProps {
  onBiometricAuthenticated?: (modality: BiometricModality) => void;
}

export function LoginScreen({ onBiometricAuthenticated }: LoginScreenProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [biometricConfirmed, setBiometricConfirmed] = useState<{
    modality: BiometricModality;
    hardwareBacked: boolean;
  } | null>(null);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message.replace('Firebase: ', '')
          : 'Unable to complete corporate sign-in. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricVerified = (modality: BiometricModality, hardwareBacked: boolean) => {
    setBiometricConfirmed({ modality, hardwareBacked });
    try {
      sessionStorage.setItem('meridian_biometric_verified', modality);
    } catch {
      // Ignore storage error
    }
    onBiometricAuthenticated?.(modality);
  };

  return (
    <div className="min-h-screen bg-slate-50 grid grid-cols-1 lg:grid-cols-12">
      {/* Left Institutional Brand Column */}
      <div className="relative lg:col-span-6 bg-[#0B192C] text-white flex flex-col justify-between min-h-[320px] lg:min-h-screen overflow-hidden">
        {!imgFailed ? (
          <img
            src={CORPORATE_ATRIUM_IMAGE}
            alt="Meridian Microfinance headquarters atrium"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0B192C] via-[#13294B] to-[#0B192C]" />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0B192C] via-[#0B192C]/70 to-[#0B192C]/45"
          aria-hidden="true"
        />

        <div className="relative z-10 p-8 lg:p-12 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight text-white whitespace-nowrap">
            Meridian Microfinance
          </span>
        </div>

        <div className="relative z-10 p-8 lg:p-12 max-w-xl">
          <p className="text-xs font-medium tracking-wide text-emerald-300 mb-3">
            Institutional Credit &amp; Portfolio Operations
          </p>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold tracking-tight text-white leading-tight mb-4 [text-wrap:balance]">
            Disciplined micro-lending for growing local enterprises.
          </h1>
          <p className="text-sm lg:text-base text-slate-200 leading-relaxed max-w-lg">
            Underwrite commercial credit facilities, verify officer identity with biometric passkeys,
            and monitor installment deadlines in real time.
          </p>
        </div>
      </div>

      {/* Right Secure Sign-In & Biometric Column */}
      <div className="lg:col-span-6 flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-slate-50">
        <Card className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-none p-7 sm:p-8">
          <Card.Header className="p-0 mb-5 block">
            <Card.Title className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
              Officer Portal Sign-In
            </Card.Title>
            <Card.Description className="text-sm text-slate-600 leading-relaxed mt-1.5">
              Complete biometric verification and authenticate with your corporate Google Workspace
              credentials.
            </Card.Description>
          </Card.Header>

          <Card.Content className="p-0 space-y-5">
            {errorMessage && (
              <Alert status="danger" className="rounded-md border border-red-200 bg-red-50">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title className="text-xs font-semibold text-red-900">
                    Authentication Error
                  </Alert.Title>
                  <Alert.Description className="text-xs text-red-800">
                    {errorMessage}
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            {/* Biometric Face ID & Fingerprint Module */}
            <BiometricAuthModule
              mode="login"
              onVerified={handleBiometricVerified}
            />

            {biometricConfirmed && (
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                <span>
                  {biometricConfirmed.modality === 'face_id' ? 'Face ID' : 'Fingerprint'} verified —
                  continue with corporate sign-in below.
                </span>
              </div>
            )}

            <Button
              fullWidth
              size="lg"
              variant="primary"
              isDisabled={isSubmitting}
              onPress={() => void handleGoogleSignIn()}
              className="bg-[#0B192C] hover:bg-slate-800 text-white text-sm font-medium rounded-md whitespace-nowrap"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
                />
              </svg>
              <span>{isSubmitting ? 'Verifying Credentials...' : 'Sign in with Google'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Button>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Portfolio-Isolated Access</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Loan accounts, repayment schedules, and ledger records are scoped to your
                    verified officer account.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <LockKeyhole className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">Biometric Desk Lock</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supports platform Face ID and fingerprint WebAuthn passkeys for rapid session
                    re-verification.
                  </p>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
