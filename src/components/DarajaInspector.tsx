import React, { useState } from 'react';
import { Copy, Check, Terminal, Lock, Webhook, ArrowRightLeft } from 'lucide-react';
import { MpesaTransaction, DarajaConfigStatus } from '../types/mpesa';

interface DarajaInspectorProps {
  selectedTransaction: MpesaTransaction | null;
  allTransactions: MpesaTransaction[];
  onSelectTransaction: (tx: MpesaTransaction) => void;
  config: DarajaConfigStatus | null;
}

type InspectorTab = 'REQUEST' | 'RESPONSE' | 'CALLBACK' | 'CODE';

export const DarajaInspector: React.FC<DarajaInspectorProps> = ({
  selectedTransaction,
  allTransactions,
  onSelectTransaction,
  config,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('CALLBACK');
  const [copied, setCopied] = useState(false);

  const tx = selectedTransaction || allTransactions[0] || null;

  if (!tx) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <p className="text-sm font-medium text-slate-700">No transaction selected for inspection</p>
        <p className="text-xs text-slate-500 mt-1">
          Initiate an M-Pesa STK Push from the checkout terminal to inspect live Daraja 2.0 JSON
          payloads.
        </p>
      </div>
    );
  }

  const getFormattedCode = (): string => {
    if (activeTab === 'REQUEST') {
      return JSON.stringify(tx.rawRequest, null, 2);
    }
    if (activeTab === 'RESPONSE') {
      return JSON.stringify(tx.rawResponse, null, 2);
    }
    if (activeTab === 'CALLBACK') {
      if (!tx.rawCallback) {
        return JSON.stringify(
          {
            status: 'WAITING_FOR_USER_PIN',
            note: 'Customer has not yet entered their M-Pesa PIN on the SIM Toolkit prompt.',
            CheckoutRequestID: tx.checkoutRequestId,
          },
          null,
          2
        );
      }
      return JSON.stringify(tx.rawCallback, null, 2);
    }
    // CODE snippet
    return `// Safaricom Daraja 2.0 - Lipa Na M-Pesa Online (STK Push)
const timestamp = "${tx.rawRequest.Timestamp}";
const shortCode = "${tx.rawRequest.BusinessShortCode}";
const passkey = process.env.MPESA_PASSKEY;
const password = Buffer.from(\`\${shortCode}\${passkey}\${timestamp}\`).toString("base64");

const response = await fetch("${
      config?.stkPushEndpoint ||
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    }", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${accessToken}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${JSON.stringify(tx.rawRequest, null, 4)})
});

const data = await response.json();
console.log("CheckoutRequestID:", data.CheckoutRequestID);`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFormattedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Top Endpoints & Cryptographic Password Breakdown Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900">Daraja OAuth 2.0 & STK Endpoint</span>
            <span className="font-mono text-[11px] text-[#008741]">
              {config?.environment === 'production' ? 'Production' : 'Sandbox v2'}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-600 break-all bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
            POST /mpesa/stkpush/v1/processrequest
          </div>
          <div className="text-[11px] text-slate-500">
            ShortCode: <span className="font-mono text-slate-800">{tx.shortCode}</span> · Type:{' '}
            <span className="font-mono text-slate-800">{tx.transactionType}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#00A651]" />
              <span>Base64 Password Computation</span>
            </span>
            <span className="font-mono text-[11px] text-slate-500">SHA256 Passkey</span>
          </div>
          <div className="text-[11px] font-mono text-slate-600 truncate bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
            Base64({tx.shortCode} + Passkey + {tx.rawRequest.Timestamp})
          </div>
          <div className="text-[11px] text-slate-500 truncate font-mono">
            Output: {tx.rawRequest.Password.slice(0, 36)}...
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Webhook className="w-3.5 h-3.5 text-[#00A651]" />
              <span>Webhook Callback Receiver</span>
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              ResultCode: {tx.resultCode ?? 'Pending'}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-600 truncate bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
            {tx.rawRequest.CallBackURL}
          </div>
          <div className="text-[11px] text-slate-500">
            CheckoutRequestID:{' '}
            <span className="font-mono text-slate-800">{tx.checkoutRequestId}</span>
          </div>
        </div>
      </div>

      {/* Main Inspector Split View */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Transaction Selector List (4 Cols) */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60">
            <div className="text-xs font-semibold text-slate-900">
              Select Transaction Log ({allTransactions.length})
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Click any STK Push event to inspect its HTTP request and webhook body.
            </div>
          </div>
          <div className="divide-y divide-slate-200/80 max-h-[460px] overflow-y-auto">
            {allTransactions.map((item) => {
              const isSelected = item.checkoutRequestId === tx.checkoutRequestId;
              return (
                <button
                  key={item.checkoutRequestId}
                  type="button"
                  onClick={() => onSelectTransaction(item)}
                  className={`w-full text-left p-3.5 transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                    isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                      <span className="font-mono">{item.accountReference}</span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-[#008741]">
                        {item.mpesaReceiptNumber || item.status}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                      +{item.phoneNumber} · {item.checkoutRequestId}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
                      KES {item.amount.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Code: {item.resultCode ?? '—'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right JSON & Code Viewer (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col bg-[#090D16] text-slate-100">
          {/* Code Header & Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-[#0F172A]">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'CALLBACK', label: '1. Async Webhook Callback' },
                  { id: 'REQUEST', label: '2. STK Push Request' },
                  { id: 'RESPONSE', label: '3. Sync Response' },
                  { id: 'CODE', label: '4. Node.js SDK Snippet' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#00A651] text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Payload</span>
                </>
              )}
            </button>
          </div>

          {/* Sub-header Metadata Strip */}
          <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>MerchantRequestID: {tx.merchantRequestId}</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>CheckoutRequestID: {tx.checkoutRequestId}</span>
            </div>
          </div>

          {/* Code Block */}
          <div className="p-5 overflow-x-auto flex-1">
            <pre className="text-xs font-mono leading-relaxed text-emerald-300 select-all">
              <code>{getFormattedCode()}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
