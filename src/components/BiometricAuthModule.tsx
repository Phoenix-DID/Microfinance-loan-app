import React, { useEffect, useState } from 'react';
import { Button, Separator } from '@heroui/react';
import {
  CheckCircle2,
  Fingerprint,
  ScanFace,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  BiometricEnrollment,
  BiometricModality,
  checkPlatformBiometricSupport,
  clearBiometricEnrollment,
  enrollBiometricPasskey,
  getSavedBiometricEnrollment,
  verifyBiometricAssertion,
} from '../utils/webauthn';

interface BiometricAuthModuleProps {
  userLabel?: string;
  mode: 'login' | 'unlock' | 'settings';
  onVerified: (modality: BiometricModality, hardwareBacked: boolean) => void;
}

export function BiometricAuthModule({
  userLabel = 'officer@meridianmfb.com',
  mode,
  onVerified,
}: BiometricAuthModuleProps) {
  const [selectedModality, setSelectedModality] = useState<BiometricModality>('face_id');
  const [hardwareAvailable, setHardwareAvailable] = useState<boolean | null>(null);
  const [enrollment, setEnrollment] = useState<BiometricEnrollment | null>(() =>
    getSavedBiometricEnrollment()
  );
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'verified' | 'error'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void checkPlatformBiometricSupport().then((supported) => {
      if (active) setHardwareAvailable(supported);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (enrollment) {
      setSelectedModality(enrollment.modality);
    }
  }, [enrollment]);

  const modalityTitle = selectedModality === 'face_id' ? 'Face ID' : 'Fingerprint Scan';

  const handleEnroll = async () => {
    setScanState('scanning');
    setFeedbackMessage(null);
    try {
      const record = await enrollBiometricPasskey(selectedModality, userLabel);
      setEnrollment(record);
      setScanState('verified');
      setFeedbackMessage(
        `${modalityTitle} passkey enrolled${record.isHardwareBacked ? ' via device authenticator' : ' for this browser'}.`
      );
      if (mode !== 'settings') {
        onVerified(selectedModality, record.isHardwareBacked);
      }
    } catch (err) {
      setScanState('error');
      setFeedbackMessage(
        err instanceof Error ? err.message : `Unable to enroll ${modalityTitle}.`
      );
    }
  };

  const handleVerify = async () => {
    setScanState('scanning');
    setFeedbackMessage(null);
    try {
      let currentEnrollment = enrollment;
      if (!currentEnrollment) {
        currentEnrollment = await enrollBiometricPasskey(selectedModality, userLabel);
        setEnrollment(currentEnrollment);
      }
      const result = await verifyBiometricAssertion(selectedModality, currentEnrollment);
      if (result.verified) {
        setScanState('verified');
        setFeedbackMessage(`${modalityTitle} identity confirmed.`);
        onVerified(selectedModality, result.hardwareBacked);
      }
    } catch (err) {
      setScanState('error');
      setFeedbackMessage(
        err instanceof Error ? err.message : `${modalityTitle} check did not complete.`
      );
    }
  };

  const handleRevoke = () => {
    clearBiometricEnrollment();
    setEnrollment(null);
    setScanState('idle');
    setFeedbackMessage('Device biometric credential removed.');
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-slate-50/75 p-4 space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xs font-semibold text-slate-900">
            Biometric Factor Verification
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {hardwareAvailable === null
              ? 'Checking platform biometric sensor...'
              : hardwareAvailable
                ? 'Platform WebAuthn authenticator detected'
                : 'Browser biometric session verification'}
          </p>
        </div>

        {enrollment && (
          <Button
            size="sm"
            variant="ghost"
            onPress={handleRevoke}
            className="h-7 px-2 text-xs text-slate-500 hover:text-red-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset</span>
          </Button>
        )}
      </div>

      {/* Modality Selector: Face ID vs Fingerprint */}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Select biometric modality">
        <Button
          size="sm"
          variant={selectedModality === 'face_id' ? 'secondary' : 'outline'}
          onPress={() => {
            setSelectedModality('face_id');
            setScanState('idle');
            setFeedbackMessage(null);
          }}
          className={`justify-center text-xs font-medium whitespace-nowrap ${
            selectedModality === 'face_id'
              ? 'bg-white text-slate-900 border-[#0B192C] ring-1 ring-[#0B192C]'
              : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          <ScanFace className="w-4 h-4 shrink-0" />
          <span>Face ID</span>
        </Button>

        <Button
          size="sm"
          variant={selectedModality === 'fingerprint' ? 'secondary' : 'outline'}
          onPress={() => {
            setSelectedModality('fingerprint');
            setScanState('idle');
            setFeedbackMessage(null);
          }}
          className={`justify-center text-xs font-medium whitespace-nowrap ${
            selectedModality === 'fingerprint'
              ? 'bg-white text-slate-900 border-[#0B192C] ring-1 ring-[#0B192C]'
              : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          <Fingerprint className="w-4 h-4 shrink-0" />
          <span>Fingerprint</span>
        </Button>
      </div>

      {/* Scanner Status Frame */}
      <div className="bg-white border border-slate-200 rounded-md p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-md border flex items-center justify-center shrink-0 transition-opacity ${
              scanState === 'scanning'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 animate-pulse'
                : scanState === 'verified'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : scanState === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            {selectedModality === 'face_id' ? (
              <ScanFace className="w-5 h-5" />
            ) : (
              <Fingerprint className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {scanState === 'scanning'
                ? `Scanning ${modalityTitle}...`
                : scanState === 'verified'
                  ? `${modalityTitle} Verified`
                  : enrollment
                    ? `${enrollment.modality === 'face_id' ? 'Face ID' : 'Fingerprint'} Enrolled`
                    : `${modalityTitle} Ready`}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {feedbackMessage ||
                (enrollment
                  ? enrollment.deviceLabel
                  : `Enroll or verify with ${modalityTitle} to continue`)}
            </p>
          </div>
        </div>

        {scanState === 'verified' && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />}
        {scanState === 'error' && <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />}
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          isDisabled={scanState === 'scanning'}
          onPress={() => void handleVerify()}
          className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium whitespace-nowrap"
        >
          {scanState === 'scanning'
            ? 'Verifying...'
            : mode === 'unlock'
              ? `Unlock with ${modalityTitle}`
              : mode === 'settings'
                ? `Test ${modalityTitle}`
                : `Verify with ${modalityTitle}`}
        </Button>

        {!enrollment && (
          <Button
            size="sm"
            variant="outline"
            isDisabled={scanState === 'scanning'}
            onPress={() => void handleEnroll()}
            className="bg-white border-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap"
          >
            Enroll
          </Button>
        )}
      </div>
    </div>
  );
}
