import React from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Smartphone,
  Server,
  Lock,
} from 'lucide-react';
import { DarajaConfigStatus } from '../types/mpesa';

interface RealMoneyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DarajaConfigStatus | null;
}

export const RealMoneyGuideModal: React.FC<RealMoneyGuideModalProps> = ({
  isOpen,
  onClose,
  config,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const isLive = config?.environment === 'production' && config?.hasLiveCredentials;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#00A651] px-6 py-5 text-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isLive ? 'bg-white animate-pulse' : 'bg-amber-300'
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {isLive ? 'Real Money Production Active' : 'Safaricom Daraja Configuration'}
              </span>
            </div>
            <h3 className="text-xl font-bold tracking-tight mt-1">
              Real Money M-Pesa Transactions
            </h3>
            <p className="text-xs text-white/90 mt-0.5">
              How this app handles real Kenyan Shillings directly to your Safaricom Business ShortCode.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close real money guide modal"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Current Live Environment Status Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">Your Environment Status</span>
              <span
                className={`font-mono text-xs font-semibold ${
                  isLive ? 'text-[#008741]' : 'text-amber-600'
                }`}
              >
                {isLive ? 'LIVE PRODUCTION (REAL MONEY)' : 'SANDBOX / SIMULATOR'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                <span className="text-slate-500 block">Configured ShortCode (PartyB)</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {config?.shortCode || '174379'}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                <span className="text-slate-500 block">Safaricom API Host</span>
                <span className="font-mono font-medium text-slate-800 text-xs truncate block">
                  {config?.environment === 'production'
                    ? 'https://api.safaricom.co.ke'
                    : 'https://sandbox.safaricom.co.ke'}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Public Callback Webhook URL</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(config?.callbackUrl || '', 'callback')}
                    className="text-xs text-[#008741] hover:underline flex items-center gap-1 cursor-pointer font-mono"
                  >
                    {copiedKey === 'callback' ? (
                      <>
                        <Check className="w-3 h-3 text-[#00A651]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
                <span className="font-mono text-slate-700 text-xs break-all block mt-1">
                  {config?.callbackUrl}
                </span>
              </div>
            </div>
          </div>

          {/* How Real Money Flow Works */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900">
              How Live Real Money Transactions Work
            </h4>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                <Smartphone className="w-4 h-4 text-[#00A651] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block">
                    1. Prompt Dispatches to Customer's Real Physical Phone
                  </strong>
                  When you click <em>Send STK Push Prompt</em> with a real Kenyan Safaricom phone
                  number (e.g. your own phone number), Safaricom immediately transmits an encrypted
                  SIM Toolkit dialog to that physical phone handset.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                <Lock className="w-4 h-4 text-[#00A651] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block">
                    2. Customer Enters Their Real M-Pesa PIN
                  </strong>
                  The customer types their confidential 4-digit PIN on their handset. Safaricom's core
                  telecom switch verifies balance and debits the customer's wallet.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                <Server className="w-4 h-4 text-[#00A651] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block">
                    3. Safaricom Posts Real Webhook & Settles to Your PayBill/Till
                  </strong>
                  Safaricom sends the official <code className="font-mono">MpesaReceiptNumber</code>{' '}
                  (e.g.{' '}
                  <span className="font-mono font-semibold text-emerald-700">UJ483DSNN5</span>) to
                  this app's callback webhook. The ledger updates automatically and displays the
                  official printable receipt.
                </div>
              </div>
            </div>
          </div>

          {/* Testing with Real Money Safely */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-[#00A651]" />
              <span>How to Safely Test Right Now</span>
            </div>
            <p>
              To confirm your real connection, enter <strong>your own Safaricom phone number</strong>{' '}
              and a small amount like <strong>KES 1</strong> or <strong>KES 10</strong> on the
              checkout terminal. You will immediately feel your phone buzz with Safaricom's real
              M-Pesa PIN prompt!
            </p>
          </div>

          {/* Safaricom Requirements for Live Paybills */}
          <div className="space-y-2 text-xs text-slate-500 border-t border-slate-200 pt-4">
            <div className="font-semibold text-slate-800">
              Required Safaricom Daraja Credentials:
            </div>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong className="text-slate-700">Business ShortCode:</strong> Your Safaricom PayBill
                or Till number.
              </li>
              <li>
                <strong className="text-slate-700">Online Passkey:</strong> Generated on Safaricom's
                Daraja portal under <em>Go Live</em>.
              </li>
              <li>
                <strong className="text-slate-700">Consumer Key & Consumer Secret:</strong> From your
                Live Daraja App.
              </li>
            </ul>
            <div className="pt-2">
              <a
                href="https://developer.safaricom.co.ke"
                target="_blank"
                rel="noreferrer"
                className="text-[#008741] font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>Open Safaricom Daraja Developer Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
