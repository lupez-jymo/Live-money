import React, { useState } from 'react';
import { X, Check, Copy, Printer, Download, CheckCircle2 } from 'lucide-react';
import { MpesaTransaction } from '../types/mpesa';

interface ReceiptModalProps {
  transaction: MpesaTransaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!transaction) return null;

  const receiptCode = transaction.mpesaReceiptNumber || 'PENDING';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(receiptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(transaction, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mpesa-receipt-${receiptCode.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Emerald Banner */}
        <div className="bg-[#00A651] px-6 py-5 text-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <span className="text-xs font-medium tracking-wide opacity-90">
                Safaricom Lipa Na M-PESA Online
              </span>
            </div>
            <h3 className="text-lg font-bold tracking-tight mt-1">
              Official Payment Advice
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt modal"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-5">
          {/* Amount & Receipt Code Anchor */}
          <div className="text-center border-b border-dashed border-slate-200 pb-5">
            <div className="text-xs text-slate-500">Total Amount Paid</div>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              KES {transaction.amount.toLocaleString()}.00
            </div>
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-slate-600">
              <span>M-PESA Receipt No:</span>
              <span className="font-mono font-semibold text-[#008741] select-all">
                {receiptCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Copy Receipt Number"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[#00A651]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Structured Key-Value Rows */}
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Transaction Type</span>
              <span className="font-mono text-slate-900">
                {transaction.transactionType === 'CustomerBuyGoodsOnline'
                  ? 'Buy Goods & Services (Till)'
                  : 'PayBill Online (STK Push)'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Merchant / Description</span>
              <span className="font-medium text-slate-900">{transaction.transactionDesc}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Business ShortCode</span>
              <span className="font-mono text-slate-900 tabular-nums">
                {transaction.shortCode}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Account Reference</span>
              <span className="font-mono font-medium text-slate-900">
                {transaction.accountReference}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Customer Name</span>
              <span className="font-medium text-slate-900">{transaction.customerName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Customer MSISDN</span>
              <span className="font-mono text-slate-900 tabular-nums">
                +{transaction.phoneNumber}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Daraja Timestamp</span>
              <span className="font-mono text-slate-700 tabular-nums">
                {transaction.transactionDate}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">CheckoutRequestID</span>
              <span className="font-mono text-slate-600 text-[11px]">
                {transaction.checkoutRequestId}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
