import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ShieldCheck,
  Delete,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
  Code2,
  Wifi,
  BatteryCharging,
  RotateCcw,
} from 'lucide-react';
import { MpesaTransaction } from '../types/mpesa';

interface SimToolkitDeviceProps {
  activeTransaction: MpesaTransaction | null;
  previewPhone: string;
  previewAmount: number;
  previewAccountRef: string;
  previewShortCode: string;
  previewMerchantName: string;
  onSimulateAction: (
    checkoutRequestId: string,
    action: 'AUTHORIZE' | 'CANCEL' | 'INSUFFICIENT_FUNDS' | 'WRONG_PIN' | 'TIMEOUT',
    pin?: string
  ) => Promise<void>;
  onOpenReceipt: (tx: MpesaTransaction) => void;
  onInspectPayload: (tx: MpesaTransaction) => void;
  onResetTerminal: () => void;
  isSubmittingAction: boolean;
}

export const SimToolkitDevice: React.FC<SimToolkitDeviceProps> = ({
  activeTransaction,
  previewPhone,
  previewAmount,
  previewAccountRef,
  previewShortCode,
  previewMerchantName,
  onSimulateAction,
  onOpenReceipt,
  onInspectPayload,
  onResetTerminal,
  isSubmittingAction,
}) => {
  const [pin, setPin] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Reset PIN when a new transaction arrives
  useEffect(() => {
    if (activeTransaction?.status === 'PENDING') {
      setPin('');
      setElapsedSeconds(0);
    }
  }, [activeTransaction?.checkoutRequestId, activeTransaction?.status]);

  // Live elapsed timer while STK Push is waiting for user PIN
  useEffect(() => {
    if (activeTransaction?.status !== 'PENDING') return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTransaction?.status]);

  const handleDigitPress = (digit: string) => {
    if (pin.length < 4 && !isSubmittingAction) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (!isSubmittingAction) {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handleSendPin = () => {
    if (!activeTransaction || pin.length < 4 || isSubmittingAction) return;
    onSimulateAction(activeTransaction.checkoutRequestId, 'AUTHORIZE', pin);
  };

  const formattedPhone = previewPhone || '254712345678';
  const isPending = activeTransaction?.status === 'PENDING';
  const isCompleted = activeTransaction?.status === 'COMPLETED';
  const isFailedOrCancelled =
    activeTransaction &&
    (activeTransaction.status === 'CANCELLED' ||
      activeTransaction.status === 'FAILED' ||
      activeTransaction.status === 'TIMEOUT');

  return (
    <div className="flex flex-col items-center">
      {/* Section Header */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
            Interactive SIM Toolkit Handset
          </h2>
          <p className="text-xs text-slate-500">
            Target MSISDN: <span className="font-mono text-slate-700">+{formattedPhone}</span>
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono tabular-nums">
          {isPending ? `STK Active · ${elapsedSeconds}s` : 'Safaricom 5G · KE'}
        </div>
      </div>

      {/* Hardware Handset Bezel (#090D16) */}
      <div className="w-full max-w-[360px] bg-[#090D16] rounded-[36px] p-3.5 shadow-xl border border-slate-800 relative">
        {/* Top Earpiece Notch */}
        <div className="w-24 h-1.5 bg-slate-800 rounded-full mx-auto mb-2.5" />

        {/* Inner Handset Viewport */}
        <div className="bg-[#0F172A] rounded-[26px] overflow-hidden border border-slate-800/90 min-h-[540px] flex flex-col justify-between relative text-white">
          {/* Phone Carrier Status Bar */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2 text-[11px] font-medium text-slate-300 border-b border-slate-800/60">
            <span className="font-mono tracking-tight text-emerald-400">Safaricom 5G</span>
            <div className="flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5 text-slate-300" />
              <span className="font-mono tabular-nums">14:20</span>
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          {/* STATE 1: IDLE / WAITING FOR STK PUSH INITIATION */}
          {!activeTransaction && (
            <div className="flex-1 flex flex-col justify-between p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="text-xs text-slate-400">SIM Toolkit Menu</div>
                    <div className="text-sm font-semibold text-white mt-0.5">
                      Safaricom M-PESA
                    </div>
                  </div>
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>

                {/* Simulated SIM Menu List */}
                <div className="space-y-1.5 text-xs">
                  {[
                    'Send Money',
                    'Withdraw Cash',
                    'Buy Airtime',
                    'Loans and Savings',
                    'Lipa na M-PESA',
                    'My Account',
                  ].map((item, idx) => (
                    <div
                      key={item}
                      className={`px-3 py-2 rounded-lg flex items-center justify-between ${
                        idx === 4
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium'
                          : 'bg-slate-900/70 text-slate-400'
                      }`}
                    >
                      <span>{item}</span>
                      <span className="font-mono text-[10px] opacity-60">0{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview of Staged Checkout */}
              <div className="mt-4 bg-slate-900/95 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Staged STK Push Preview</span>
                  <span className="font-mono text-emerald-400">Ready</span>
                </div>
                <div className="text-xs text-slate-200 leading-relaxed">
                  Pay{' '}
                  <span className="font-mono font-semibold text-white tabular-nums">
                    KES {(previewAmount || 0).toLocaleString()}
                  </span>{' '}
                  to <span className="text-white font-medium">{previewMerchantName}</span> (
                  <span className="font-mono text-slate-300">{previewShortCode}</span>)
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Account Ref: {previewAccountRef || 'INV-001'}
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  Click <strong className="text-slate-200">Send STK Push Prompt</strong> on the left
                  terminal to wake this handset with a live PIN prompt.
                </p>
              </div>
            </div>
          )}

          {/* STATE 2: ACTIVE SIM TOOLKIT PIN ENTRY OVERLAY */}
          {isPending && activeTransaction && (
            <div className="flex-1 flex flex-col justify-between p-4 bg-slate-950/90 animate-fadeIn">
              {/* Native Android/iOS SIM Toolkit Dialog */}
              <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                  <span className="text-xs font-semibold text-emerald-400 tracking-wide">
                    M-PESA SIM Toolkit
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {activeTransaction.shortCode}
                  </span>
                </div>

                {activeTransaction.mode === 'LIVE_DARAJA' && (
                  <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-2.5 text-center">
                    <div className="text-[11px] font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Live Prompt Sent to Handset</span>
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5">
                      Check your physical phone (+{activeTransaction.phoneNumber}) now to enter PIN!
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-100 leading-relaxed">
                  Do you want to pay{' '}
                  <span className="font-mono font-semibold text-emerald-300 tabular-nums">
                    KES {activeTransaction.amount.toLocaleString()}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-white">
                    {activeTransaction.transactionDesc}
                  </span>{' '}
                  Account No.{' '}
                  <span className="font-mono text-slate-200">
                    {activeTransaction.accountReference}
                  </span>
                  ?
                </p>

                {/* Masked PIN Input Box */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Enter M-PESA PIN:</span>
                    <button
                      type="button"
                      onClick={() => setPin('1234')}
                      className="text-emerald-400 hover:underline font-mono text-[11px]"
                    >
                      Auto-fill 1234
                    </button>
                  </div>
                  <div className="h-11 bg-[#090D16] border border-emerald-500/60 rounded-xl flex items-center justify-center gap-4 px-4">
                    {[0, 1, 2, 3].map((idx) => {
                      const filled = idx < pin.length;
                      return (
                        <span
                          key={idx}
                          className={`w-3 h-3 rounded-full transition-transform duration-150 ${
                            filled
                              ? 'bg-emerald-400 scale-110'
                              : 'bg-slate-700 border border-slate-600'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-slate-400 text-center font-mono">
                    Tip: Any 4 digits authorize · 0000 tests Wrong PIN (2001)
                  </div>
                </div>

                {/* STK Cancel / Send Action Row */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isSubmittingAction}
                    onClick={() =>
                      onSimulateAction(activeTransaction.checkoutRequestId, 'CANCEL')
                    }
                    className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={pin.length < 4 || isSubmittingAction}
                    onClick={handleSendPin}
                    className="py-2 px-3 rounded-lg bg-[#00A651] hover:bg-[#008741] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 cursor-pointer"
                  >
                    {isSubmittingAction ? 'Verifying...' : 'Send'}
                  </button>
                </div>
              </div>

              {/* Tactile Numeric Keypad */}
              <div className="grid grid-cols-3 gap-1.5 pt-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleDigitPress(digit)}
                    className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white font-mono text-sm font-semibold transition-colors cursor-pointer border border-slate-800/80"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPin('')}
                  className="h-10 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 font-mono text-xs transition-colors cursor-pointer border border-slate-800/60"
                >
                  CLR
                </button>
                <button
                  type="button"
                  onClick={() => handleDigitPress('0')}
                  className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white font-mono text-sm font-semibold transition-colors cursor-pointer border border-slate-800/80"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Backspace"
                  className="h-10 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors cursor-pointer border border-slate-800/60"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STATE 3: COMPLETED SMS CONFIRMATION & RECEIPT PREVIEW */}
          {isCompleted && activeTransaction && (
            <div className="flex-1 flex flex-col justify-between p-5 bg-[#0F172A]">
              <div className="space-y-4">
                {/* Success Header */}
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-white">
                      M-PESA Callback Confirmed
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      ResultCode: 0 · {activeTransaction.latencyMs}ms
                    </div>
                  </div>
                </div>

                {/* Authentic MPESA SMS Notification Bubble */}
                <div className="bg-[#1E293B] border border-emerald-500/30 rounded-2xl p-4 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-700/70 pb-1.5">
                    <span className="font-semibold text-emerald-400">MPESA</span>
                    <span className="font-mono">SMS · Just now</span>
                  </div>
                  <p className="text-xs text-slate-100 font-mono leading-relaxed select-all">
                    {activeTransaction.mpesaReceiptNumber} Confirmed. Ksh
                    {activeTransaction.amount.toLocaleString()}.00 paid to{' '}
                    {activeTransaction.transactionDesc} for account{' '}
                    {activeTransaction.accountReference} on{' '}
                    {new Date(activeTransaction.completedAt || Date.now()).toLocaleDateString(
                      'en-KE'
                    )}{' '}
                    at{' '}
                    {new Date(activeTransaction.completedAt || Date.now()).toLocaleTimeString(
                      'en-KE',
                      { hour: '2-digit', minute: '2-digit' }
                    )}
                    .
                  </p>
                </div>

                {/* Key Callback Metadata */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">MpesaReceiptNumber</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      {activeTransaction.mpesaReceiptNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount Settled</span>
                    <span className="font-mono text-white tabular-nums">
                      KES {activeTransaction.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PhoneNumber</span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      +{activeTransaction.phoneNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CheckoutRequestID</span>
                    <span className="font-mono text-slate-400 truncate max-w-[165px]">
                      {activeTransaction.checkoutRequestId}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-3">
                <button
                  type="button"
                  onClick={() => onOpenReceipt(activeTransaction)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#00A651] hover:bg-[#008741] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>View Official Receipt</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onInspectPayload(activeTransaction)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Webhook JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={onResetTerminal}
                    className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-800 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>New Push</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATE 4: CANCELLED / FAILED / TIMEOUT STATE */}
          {isFailedOrCancelled && activeTransaction && (
            <div className="flex-1 flex flex-col justify-between p-5 bg-[#0F172A]">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-amber-400">
                  {activeTransaction.status === 'TIMEOUT' ? (
                    <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-white">
                      STK Push {activeTransaction.status}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      ResultCode: {activeTransaction.resultCode}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="text-xs font-medium text-slate-300">Daraja ResultDesc</div>
                  <p className="text-xs font-mono text-rose-300 leading-relaxed">
                    {activeTransaction.resultDesc}
                  </p>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Attempted Amount</span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      KES {activeTransaction.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account Reference</span>
                    <span className="font-mono text-slate-200">
                      {activeTransaction.accountReference}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => onInspectPayload(activeTransaction)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Callback Log</span>
                </button>
                <button
                  type="button"
                  onClick={onResetTerminal}
                  className="py-2.5 px-3 rounded-xl bg-[#00A651] hover:bg-[#008741] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Push</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Home Indicator Bar */}
          <div className="py-2.5 bg-[#090D16]/60 flex justify-center">
            <div className="w-28 h-1 bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>

      {/* Quick Daraja Callback Scenario Simulator Strip (Active when STK Push is Pending) */}
      {isPending && activeTransaction && (
        <div className="w-full max-w-[360px] mt-3 bg-white border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">Simulate Daraja Edge Callbacks</span>
            <span className="text-[11px] text-slate-500 font-mono">Webhook Test</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={isSubmittingAction}
              onClick={() =>
                onSimulateAction(activeTransaction.checkoutRequestId, 'INSUFFICIENT_FUNDS')
              }
              className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="ResultCode: 1 - The balance is insufficient for the transaction"
            >
              Low Funds (1)
            </button>
            <button
              type="button"
              disabled={isSubmittingAction}
              onClick={() => onSimulateAction(activeTransaction.checkoutRequestId, 'CANCEL')}
              className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="ResultCode: 1032 - Request cancelled by user"
            >
              Cancel (1032)
            </button>
            <button
              type="button"
              disabled={isSubmittingAction}
              onClick={() => onSimulateAction(activeTransaction.checkoutRequestId, 'TIMEOUT')}
              className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="ResultCode: 1037 - DS timeout user cannot be reached"
            >
              Timeout (1037)
            </button>
          </div>
        </div>
      )}

      {/* Security Note */}
      {!isPending && (
        <div className="w-full max-w-[360px] mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#00A651] shrink-0" />
          <span>Daraja 2.0 TLS · Base64 Passkey Verification</span>
        </div>
      )}
    </div>
  );
};
