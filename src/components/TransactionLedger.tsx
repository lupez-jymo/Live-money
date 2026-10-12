import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Receipt,
  Code2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { MpesaTransaction, TransactionStatus } from '../types/mpesa';

interface TransactionLedgerProps {
  transactions: MpesaTransaction[];
  onOpenReceipt: (tx: MpesaTransaction) => void;
  onInspectPayload: (tx: MpesaTransaction) => void;
  onSelectForPhone: (tx: MpesaTransaction) => void;
  onRefreshQuery: (checkoutRequestId: string) => Promise<void>;
}

type FilterTab = 'ALL' | 'COMPLETED' | 'PENDING' | 'UNSUCCESSFUL';

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({
  transactions,
  onOpenReceipt,
  onInspectPayload,
  onSelectForPhone,
  onRefreshQuery,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [queryingId, setQueryingId] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (activeFilter === 'COMPLETED' && tx.status !== 'COMPLETED') return false;
      if (activeFilter === 'PENDING' && tx.status !== 'PENDING') return false;
      if (
        activeFilter === 'UNSUCCESSFUL' &&
        tx.status !== 'CANCELLED' &&
        tx.status !== 'FAILED' &&
        tx.status !== 'TIMEOUT'
      ) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tx.phoneNumber.toLowerCase().includes(q) ||
        tx.customerName.toLowerCase().includes(q) ||
        tx.accountReference.toLowerCase().includes(q) ||
        tx.transactionDesc.toLowerCase().includes(q) ||
        (tx.mpesaReceiptNumber && tx.mpesaReceiptNumber.toLowerCase().includes(q)) ||
        tx.checkoutRequestId.toLowerCase().includes(q)
      );
    });
  }, [transactions, activeFilter, searchQuery]);

  const handleExportCsv = () => {
    const headers = [
      'MpesaReceiptNumber',
      'Status',
      'ResultCode',
      'Amount_KES',
      'PhoneNumber',
      'CustomerName',
      'AccountReference',
      'ShortCode',
      'TransactionType',
      'CheckoutRequestID',
      'Timestamp',
    ];
    const rows = filteredTransactions.map((tx) => [
      tx.mpesaReceiptNumber || 'N/A',
      tx.status,
      tx.resultCode ?? 'PENDING',
      tx.amount,
      tx.phoneNumber,
      `"${tx.customerName}"`,
      `"${tx.accountReference}"`,
      tx.shortCode,
      tx.transactionType,
      tx.checkoutRequestId,
      tx.createdAt,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mpesa-daraja-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleQueryStatus = async (checkoutRequestId: string) => {
    setQueryingId(checkoutRequestId);
    try {
      await onRefreshQuery(checkoutRequestId);
    } finally {
      setQueryingId(null);
    }
  };

  const renderStatusText = (status: TransactionStatus, resultCode: number | null) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16A34A]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Completed</span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-[11px] text-slate-500">0</span>
          </div>
        );
      case 'PENDING':
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D97706]">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Awaiting PIN</span>
          </div>
        );
      case 'CANCELLED':
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Cancelled</span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-[11px] text-slate-500">{resultCode ?? 1032}</span>
          </div>
        );
      case 'TIMEOUT':
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D97706]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>DS Timeout</span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-[11px] text-slate-500">{resultCode ?? 1037}</span>
          </div>
        );
      case 'FAILED':
      default:
        return (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#DC2626]">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Failed</span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-[11px] text-slate-500">{resultCode ?? 1}</span>
          </div>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Toolbar Header */}
      <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            M-Pesa STK Push Transaction & Webhook Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time reconciliation of Lipa Na M-Pesa Online requests, callback result codes, and
            Safaricom receipt numbers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Interactive Segmented Filter Controls */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'COMPLETED', label: 'Completed' },
                { id: 'PENDING', label: 'Pending' },
                { id: 'UNSUCCESSFUL', label: 'Cancelled / Failed' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipt UJK..., 2547..., or ref"
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00A651] w-56"
            />
          </div>

          {/* CSV Statement Export */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
              <th className="py-3 px-4">M-Pesa Receipt</th>
              <th className="py-3 px-4">Customer & MSISDN</th>
              <th className="py-3 px-4">Account Ref · ShortCode</th>
              <th className="py-3 px-4">Status · Code</th>
              <th className="py-3 px-4 text-right">Amount (KES)</th>
              <th className="py-3 px-4 text-right">Time</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-xs">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="max-w-xs mx-auto space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      No matching M-Pesa transactions found
                    </p>
                    <p className="text-xs text-slate-500">
                      Adjust your filter or initiate a new STK Push from the checkout terminal.
                    </p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setActiveFilter('ALL');
                        }}
                        className="mt-2 px-3 py-1.5 text-xs font-medium text-[#00A651] hover:underline cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr
                  key={tx.checkoutRequestId}
                  className="hover:bg-slate-50/90 transition-colors group"
                >
                  {/* Receipt Column */}
                  <td className="py-3 px-4 font-mono whitespace-nowrap">
                    {tx.mpesaReceiptNumber ? (
                      <button
                        type="button"
                        onClick={() => onOpenReceipt(tx)}
                        className="font-semibold text-[#008741] hover:underline cursor-pointer"
                      >
                        {tx.mpesaReceiptNumber}
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Customer & MSISDN */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900">{tx.customerName}</div>
                    <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                      +{tx.phoneNumber}
                    </div>
                  </td>

                  {/* Account Reference & ShortCode (Unboxed metadata with · separator) */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <span className="font-mono font-medium">{tx.accountReference}</span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {tx.shortCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[210px]">
                      {tx.transactionDesc}
                    </div>
                  </td>

                  {/* Status · ResultCode */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {renderStatusText(tx.status, tx.resultCode)}
                    <div className="text-[11px] text-slate-400 truncate max-w-[190px]">
                      {tx.resultDesc}
                    </div>
                  </td>

                  {/* Numeric Amount (Right-aligned tabular-nums) */}
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {tx.amount.toLocaleString()}.00
                  </td>

                  {/* Timestamp */}
                  <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleTimeString('en-KE', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>

                  {/* Row Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      {tx.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => onSelectForPhone(tx)}
                          className="px-2.5 py-1 rounded-md bg-[#00A651] text-white text-[11px] font-medium hover:bg-[#008741] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Enter PIN
                        </button>
                      )}
                      {tx.status === 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(tx)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Official M-Pesa Receipt"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleQueryStatus(tx.checkoutRequestId)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Run Daraja STK Push Status Query (/stkpushquery/v1/query)"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            queryingId === tx.checkoutRequestId ? 'animate-spin text-[#00A651]' : ''
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => onInspectPayload(tx)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Inspect Daraja JSON Request & Callback Payload"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
