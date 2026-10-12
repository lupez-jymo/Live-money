import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  ShieldCheck,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Building2,
  Phone,
  Hash,
  FileText,
  CreditCard,
} from 'lucide-react';
import {
  MpesaTransaction,
  TransactionType,
  DarajaConfigStatus,
  CheckoutPreset,
} from './types/mpesa';
import { SimToolkitDevice } from './components/SimToolkitDevice';
import { TransactionLedger } from './components/TransactionLedger';
import { DarajaInspector } from './components/DarajaInspector';
import { ReceiptModal } from './components/ReceiptModal';
import { RealMoneyGuideModal } from './components/RealMoneyGuideModal';

const KENYAN_MERCHANT_PRESETS: CheckoutPreset[] = [
  {
    id: 'kplc',
    title: 'KPLC Prepaid Tokens',
    category: 'Utility PayBill',
    amount: 1500,
    accountReference: 'KPLC-1428990',
    transactionDesc: 'Kenya Power Prepaid Token',
    transactionType: 'CustomerPayBillOnline',
    shortCode: '888880',
    merchantName: 'Kenya Power & Lighting',
  },
  {
    id: 'naivas',
    title: 'Naivas Supermarket',
    category: 'Retail BuyGoods Till',
    amount: 2450,
    accountReference: 'POS-WEST-884',
    transactionDesc: 'Naivas Supermarket Westlands',
    transactionType: 'CustomerBuyGoodsOnline',
    shortCode: '542542',
    merchantName: 'Naivas Limited',
  },
  {
    id: 'zuku',
    title: 'Zuku Fiber 40Mbps',
    category: 'ISP Subscription',
    amount: 4499,
    accountReference: 'ZUKU-089142',
    transactionDesc: 'Zuku Fiber Monthly Billing',
    transactionType: 'CustomerPayBillOnline',
    shortCode: '320320',
    merchantName: 'Wananchi Group (Zuku)',
  },
  {
    id: 'expressway',
    title: 'Nairobi Expressway',
    category: 'Toll Top-Up',
    amount: 1000,
    accountReference: 'ETC-KDA892M',
    transactionDesc: 'Nairobi Expressway ETC Points',
    transactionType: 'CustomerPayBillOnline',
    shortCode: '174379',
    merchantName: 'Moja Expressway',
  },
];

type ActiveSection = 'TERMINAL' | 'LEDGER' | 'INSPECTOR';

export function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('TERMINAL');
  const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
  const [config, setConfig] = useState<DarajaConfigStatus | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [isRealMoneyModalOpen, setIsRealMoneyModalOpen] = useState<boolean>(false);

  // Form State
  const [phoneNumber, setPhoneNumber] = useState<string>('0712 345 678');
  const [customerName, setCustomerName] = useState<string>('Wanjiku Kamau');
  const [amount, setAmount] = useState<number>(1500);
  const [accountReference, setAccountReference] = useState<string>('KPLC-1428990');
  const [transactionDesc, setTransactionDesc] = useState<string>('Kenya Power Prepaid Token');
  const [transactionType, setTransactionType] = useState<TransactionType>(
    'CustomerPayBillOnline'
  );
  const [shortCode, setShortCode] = useState<string>('888880');
  const [activePresetId, setActivePresetId] = useState<string>('kplc');

  // Active STK Flow State
  const [activeTxId, setActiveTxId] = useState<string | null>(null);
  const [inspectedTxId, setInspectedTxId] = useState<string | null>(null);
  const [receiptModalTx, setReceiptModalTx] = useState<MpesaTransaction | null>(null);
  const [isSendingPush, setIsSendingPush] = useState<boolean>(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const fetchInitialData = async () => {
    try {
      const [txRes, cfgRes] = await Promise.all([
        fetch('/api/mpesa/transactions'),
        fetch('/api/mpesa/config'),
      ]);
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
      }
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        setConfig(cfgData);
        if (cfgData.shortCode) {
          setShortCode(cfgData.shortCode);
        }
      }
    } catch {
      // Fallback handled gracefully
    } finally {
      setIsLoadingInitial(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const activeTransaction = useMemo(
    () => transactions.find((t) => t.checkoutRequestId === activeTxId) || null,
    [transactions, activeTxId]
  );

  // Automatic live status query loop when STK Push is pending PIN entry
  useEffect(() => {
    if (!activeTransaction || activeTransaction.status !== 'PENDING') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/mpesa/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutRequestId: activeTransaction.checkoutRequestId }),
        });
        if (res.ok) {
          const data = await res.json();
          const queriedTx: MpesaTransaction = data.transaction;
          if (queriedTx && queriedTx.status !== 'PENDING') {
            setTransactions((prev) =>
              prev.map((t) => (t.checkoutRequestId === queriedTx.checkoutRequestId ? queriedTx : t))
            );
            if (queriedTx.status === 'COMPLETED') {
              setBannerMessage(
                `Payment Approved! Real M-Pesa Receipt ${queriedTx.mpesaReceiptNumber} confirmed for KES ${queriedTx.amount.toLocaleString()}.`
              );
            }
          }
        }
      } catch {
        // Polling continues
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeTransaction?.checkoutRequestId, activeTransaction?.status]);

  const inspectedTransaction = useMemo(
    () =>
      transactions.find((t) => t.checkoutRequestId === inspectedTxId) ||
      activeTransaction ||
      transactions[0] ||
      null,
    [transactions, inspectedTxId, activeTransaction]
  );

  // Quantitative Ledger Metrics
  const metrics = useMemo(() => {
    const completed = transactions.filter((t) => t.status === 'COMPLETED');
    const totalSettled = completed.reduce((sum, t) => sum + t.amount, 0);
    const finalizedCount = transactions.filter((t) => t.status !== 'PENDING').length;
    const successRate =
      finalizedCount > 0 ? Math.round((completed.length / finalizedCount) * 100) : 100;
    const avgLatency =
      completed.length > 0
        ? (
            completed.reduce((sum, t) => sum + (t.latencyMs || 4200), 0) /
            completed.length /
            1000
          ).toFixed(1)
        : '4.2';

    return {
      totalSettled,
      completedCount: completed.length,
      successRate,
      avgLatency,
      pendingCount: transactions.filter((t) => t.status === 'PENDING').length,
    };
  }, [transactions]);

  const handleSelectPreset = (preset: CheckoutPreset) => {
    setActivePresetId(preset.id);
    setAmount(preset.amount);
    setAccountReference(preset.accountReference);
    setTransactionDesc(preset.transactionDesc);
    setTransactionType(preset.transactionType);
    setShortCode(preset.shortCode);
    setFormError(null);
  };

  const formatNormalizedPreview = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('07') || digits.startsWith('01')) {
      return '254' + digits.slice(1);
    }
    if (digits.startsWith('7') || digits.startsWith('1')) {
      return '254' + digits;
    }
    return digits || '254712345678';
  };

  const handleInitiateStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setBannerMessage(null);

    const normalizedPhone = formatNormalizedPreview(phoneNumber);
    if (!/^254(7|1)\d{8}$/.test(normalizedPhone)) {
      setFormError(
        'Enter a valid Kenyan Safaricom number (e.g. 0712 345 678, 0110 448 921, or 254712345678).'
      );
      return;
    }

    if (!amount || amount < 1 || amount > 250000) {
      setFormError('Amount must be between KES 1 and KES 250,000.');
      return;
    }

    setIsSendingPush(true);
    try {
      const response = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          customerName,
          amount,
          accountReference,
          transactionDesc,
          transactionType,
          shortCode,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setFormError(data.error || 'Failed to initiate STK Push');
        return;
      }

      const createdTx: MpesaTransaction = data.transaction;
      setTransactions((prev) => [createdTx, ...prev]);
      setActiveTxId(createdTx.checkoutRequestId);
      setInspectedTxId(createdTx.checkoutRequestId);
      setBannerMessage(
        `STK Push dispatched (${createdTx.checkoutRequestId}). Enter M-Pesa PIN on the handset to complete.`
      );
    } catch {
      setFormError('Network error while contacting M-Pesa Daraja endpoint.');
    } finally {
      setIsSendingPush(false);
    }
  };

  const handleSimulateAction = async (
    checkoutRequestId: string,
    action: 'AUTHORIZE' | 'CANCEL' | 'INSUFFICIENT_FUNDS' | 'WRONG_PIN' | 'TIMEOUT',
    pin?: string
  ) => {
    setIsSubmittingAction(true);
    try {
      const res = await fetch('/api/mpesa/simulate-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutRequestId, action, pin }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated: MpesaTransaction = data.transaction;
        setTransactions((prev) =>
          prev.map((tx) => (tx.checkoutRequestId === updated.checkoutRequestId ? updated : tx))
        );
        if (updated.status === 'COMPLETED') {
          setBannerMessage(
            `Confirmed! M-Pesa Receipt ${updated.mpesaReceiptNumber} generated for KES ${updated.amount.toLocaleString()}.`
          );
        } else {
          setBannerMessage(
            `Webhook Callback received: ResultCode ${updated.resultCode} (${updated.resultDesc})`
          );
        }
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRefreshQuery = async (checkoutRequestId: string) => {
    const res = await fetch('/api/mpesa/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutRequestId }),
    });
    if (res.ok) {
      const data = await res.json();
      const queriedTx: MpesaTransaction = data.transaction;
      setTransactions((prev) =>
        prev.map((t) => (t.checkoutRequestId === queriedTx.checkoutRequestId ? queriedTx : t))
      );
      setBannerMessage(
        `Daraja Query (/stkpushquery/v1/query) -> ResultCode: ${data.ResultCode} · ${data.ResultDesc}`
      );
    }
  };

  const handleInspectPayload = (tx: MpesaTransaction) => {
    setInspectedTxId(tx.checkoutRequestId);
    setActiveSection('INSPECTOR');
  };

  const handleNewPaymentRequest = () => {
    setActiveTxId(null);
    setFormError(null);
    setBannerMessage(null);
    setActiveSection('TERMINAL');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 py-3.5">
        <div className="max-w-[1320px] mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('TERMINAL');
            }}
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Safaricom Daraja · STK Push
          </a>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveSection('TERMINAL')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeSection === 'TERMINAL'
                  ? 'border-[#00A651] text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Checkout Terminal
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('LEDGER')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeSection === 'LEDGER'
                  ? 'border-[#00A651] text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Transaction Ledger ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('INSPECTOR')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeSection === 'INSPECTOR'
                  ? 'border-[#00A651] text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Daraja API Inspector
            </button>
            <button
              type="button"
              onClick={() => setIsRealMoneyModalOpen(true)}
              className="py-1 text-[#008741] font-semibold hover:text-[#005f2c] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-[#00A651] animate-pulse" />
              <span>Real Money Guide</span>
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleNewPaymentRequest}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#00A651] hover:bg-[#008741] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              New Payment Request
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Mobile Section Switcher */}
        <div className="flex md:hidden items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
          {(
            [
              { id: 'TERMINAL', label: 'Terminal' },
              { id: 'LEDGER', label: 'Ledger' },
              { id: 'INSPECTOR', label: 'API Inspector' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeSection === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Full-Width 4-Column Quantitative KPI Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500">Settled STK Push Volume</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              KES {metrics.totalSettled.toLocaleString()}.00
            </div>
            <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <span className="text-[#16A34A] font-medium">
                {metrics.completedCount} confirmed receipts
              </span>
              <span aria-hidden="true">·</span>
              <span>Instant settlement</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500">SIM Toolkit Conversion Rate</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {metrics.successRate}%
            </div>
            <div className="text-xs text-slate-500 mt-1.5">
              <span>ResultCode 0 vs user cancellations</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500">Mean PIN Callback Latency</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {metrics.avgLatency}s
            </div>
            <div className="text-xs text-slate-500 mt-1.5">
              <span>Round-trip to /api/mpesa/callback</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500">Daraja Gateway Configuration</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              PayBill {shortCode}
            </div>
            <div className="text-xs text-slate-500 mt-1.5">
              <span>
                {config?.hasLiveCredentials
                  ? 'Live Safaricom Credentials'
                  : 'Daraja 2.0 Interactive Sandbox'}
              </span>
            </div>
          </div>
        </section>

        {/* Live Feedback Banner */}
        {bannerMessage && (
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-[#00A651] shrink-0" />
              <span className="font-medium">{bannerMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-xs text-slate-400 hover:text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* VIEW 1: CHECKOUT TERMINAL & LIVE SIM TOOLKIT HANDSET */}
        {activeSection === 'TERMINAL' && (
          <div className="space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left 7 Columns: Lipa Na M-Pesa Online Checkout Terminal */}
              <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                <div className="space-y-5">
                  {/* Terminal Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                    <div>
                      <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                        Lipa Na M-Pesa Online (STK Push) Terminal
                      </h1>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Dispatch an instant SIM Toolkit PIN prompt to any Kenyan Safaricom
                        subscriber.
                      </p>
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                      API: /stkpush/v1/processrequest
                    </div>
                  </div>

                  {/* Live Real Money Production Notice */}
                  {config?.hasLiveCredentials && (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00A651] animate-ping shrink-0 mt-1 sm:mt-0" />
                        <div>
                          <div className="text-xs font-bold text-emerald-950">
                            Real Money Mode Active · ShortCode: {config.shortCode}
                          </div>
                          <div className="text-[11px] text-emerald-800">
                            Connected directly to Safaricom's production gateway. Entering a real Safaricom number sends an instant M-Pesa PIN prompt to that subscriber's physical phone.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsRealMoneyModalOpen(true)}
                        className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline whitespace-nowrap cursor-pointer shrink-0"
                      >
                        Read Live Setup Guide
                      </button>
                    </div>
                  )}

                  {/* Quick Kenyan Merchant Scenarios */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        Quick Kenyan Merchant Scenarios
                      </span>
                      <span className="text-slate-400">Pre-fills PayBill / Till parameters</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {KENYAN_MERCHANT_PRESETS.map((preset) => {
                        const isSelected = activePresetId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectPreset(preset)}
                            className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-[#00A651] bg-emerald-50/50'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              {preset.title}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between font-mono tabular-nums">
                              <span>{preset.shortCode}</span>
                              <span className="text-[#008741] font-medium">
                                KES {preset.amount.toLocaleString()}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* STK Push Form */}
                  <form onSubmit={handleInitiateStkPush} className="space-y-4">
                    {/* Transaction Type Segmented Switch */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Daraja TransactionType
                      </label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setTransactionType('CustomerPayBillOnline')}
                          className={`py-2 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            transactionType === 'CustomerPayBillOnline'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          CustomerPayBillOnline (PayBill)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTransactionType('CustomerBuyGoodsOnline')}
                          className={`py-2 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            transactionType === 'CustomerBuyGoodsOnline'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          CustomerBuyGoodsOnline (Buy Goods Till)
                        </button>
                      </div>
                    </div>

                    {/* Customer Phone & Name Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="mpesa-phone"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          Safaricom Phone Number (PartyA)
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            id="mpesa-phone"
                            type="text"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="0712 345 678 or 254712345678"
                            className="w-full pl-9 pr-3 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#00A651]"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>MSISDN: +{formatNormalizedPreview(phoneNumber)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPhoneNumber('0722 891 044');
                              setCustomerName('Brian Ochieng');
                            }}
                            className="text-[#008741] hover:underline cursor-pointer"
                          >
                            Use Test Number
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="customer-name"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          Customer / Payer Name
                        </label>
                        <input
                          id="customer-name"
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Wanjiku Kamau"
                          className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#00A651]"
                        />
                        <div className="text-[11px] text-slate-500">
                          Recorded in merchant reconciliation ledger
                        </div>
                      </div>
                    </div>

                    {/* Amount (KES) with Quick Denominations */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="mpesa-amount"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          Transaction Amount (KES)
                        </label>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Limit: KES 1 – 250,000
                        </span>
                      </div>
                      <div className="relative">
                        <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="mpesa-amount"
                          type="number"
                          min={1}
                          max={250000}
                          value={amount}
                          onChange={(e) => setAmount(Number(e.target.value))}
                          className="w-full pl-9 pr-16 py-2.5 text-base font-bold font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#00A651]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-slate-400">
                          KES
                        </span>
                      </div>

                      {/* Quick KES Denomination Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {[100, 500, 1500, 2500, 5000, 10000].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAmount(val)}
                            className={`px-2.5 py-1 rounded-md text-xs font-mono tabular-nums border transition-colors cursor-pointer ${
                              amount === val
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            KES {val.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ShortCode, AccountReference & Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="short-code"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          BusinessShortCode
                        </label>
                        <div className="relative">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            id="short-code"
                            type="text"
                            value={shortCode}
                            onChange={(e) => setShortCode(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#00A651]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="account-ref"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          AccountReference
                        </label>
                        <div className="relative">
                          <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            id="account-ref"
                            type="text"
                            maxLength={12}
                            value={accountReference}
                            onChange={(e) => setAccountReference(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#00A651]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="tx-desc"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          TransactionDesc
                        </label>
                        <div className="relative">
                          <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            id="tx-desc"
                            type="text"
                            maxLength={32}
                            value={transactionDesc}
                            onChange={(e) => setTransactionDesc(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#00A651]"
                          />
                        </div>
                      </div>
                    </div>

                    {formError && (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSendingPush}
                      className="w-full py-3 px-5 rounded-xl bg-[#00A651] hover:bg-[#008741] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {isSendingPush
                          ? 'Dispatching Daraja STK Push...'
                          : `Send STK Push Prompt · KES ${(amount || 0).toLocaleString()}.00`}
                      </span>
                    </button>
                  </form>
                </div>

                {/* Live 4-Stage Daraja Pipeline Stepper */}
                <div className="pt-5 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span className="font-semibold text-slate-700">
                      Daraja 2.0 Request Lifecycle
                    </span>
                    {activeTransaction && (
                      <span className="font-mono text-[11px] text-slate-600">
                        ID: {activeTransaction.checkoutRequestId}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="text-[11px] text-slate-400 font-mono">01. OAuth 2.0</div>
                      <div className="font-semibold text-slate-900 mt-0.5">Bearer Token</div>
                    </div>
                    <div
                      className={`p-2.5 rounded-lg border ${
                        activeTransaction
                          ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                          : 'bg-slate-50 border-slate-200/80 text-slate-600'
                      }`}
                    >
                      <div className="text-[11px] text-slate-400 font-mono">02. STK Process</div>
                      <div className="font-semibold mt-0.5">
                        {activeTransaction ? 'ResponseCode: 0' : 'Awaiting Push'}
                      </div>
                    </div>
                    <div
                      className={`p-2.5 rounded-lg border ${
                        activeTransaction?.status === 'PENDING'
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : activeTransaction
                            ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                            : 'bg-slate-50 border-slate-200/80 text-slate-600'
                      }`}
                    >
                      <div className="text-[11px] text-slate-400 font-mono">03. Handset STK</div>
                      <div className="font-semibold mt-0.5">
                        {activeTransaction?.status === 'PENDING'
                          ? 'Enter 4-Digit PIN'
                          : activeTransaction
                            ? 'PIN Processed'
                            : 'SIM Standby'}
                      </div>
                    </div>
                    <div
                      className={`p-2.5 rounded-lg border ${
                        activeTransaction?.status === 'COMPLETED'
                          ? 'bg-emerald-50 border-emerald-300 text-[#008741]'
                          : 'bg-slate-50 border-slate-200/80 text-slate-600'
                      }`}
                    >
                      <div className="text-[11px] text-slate-400 font-mono">04. Webhook</div>
                      <div className="font-semibold font-mono mt-0.5">
                        {activeTransaction?.mpesaReceiptNumber ||
                          (activeTransaction?.resultCode !== null &&
                          activeTransaction?.resultCode !== undefined
                            ? `Code ${activeTransaction.resultCode}`
                            : 'Callback Idle')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 Columns: Interactive SIM Toolkit Phone Simulator */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-center">
                <SimToolkitDevice
                  activeTransaction={activeTransaction}
                  previewPhone={formatNormalizedPreview(phoneNumber)}
                  previewAmount={amount}
                  previewAccountRef={accountReference}
                  previewShortCode={shortCode}
                  previewMerchantName={transactionDesc}
                  onSimulateAction={handleSimulateAction}
                  onOpenReceipt={(tx) => setReceiptModalTx(tx)}
                  onInspectPayload={handleInspectPayload}
                  onResetTerminal={() => setActiveTxId(null)}
                  isSubmittingAction={isSubmittingAction}
                />
              </div>
            </section>

            {/* Below-the-Fold Live Transaction & Webhook Ledger */}
            <section>
              {isLoadingInitial ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                  <div className="h-5 w-64 bg-slate-100 rounded animate-pulse" />
                  <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
                  <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
                </div>
              ) : (
                <TransactionLedger
                  transactions={transactions}
                  onOpenReceipt={(tx) => setReceiptModalTx(tx)}
                  onInspectPayload={handleInspectPayload}
                  onSelectForPhone={(tx) => {
                    setActiveTxId(tx.checkoutRequestId);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onRefreshQuery={handleRefreshQuery}
                />
              )}
            </section>
          </div>
        )}

        {/* VIEW 2: DEDICATED TRANSACTION LEDGER */}
        {activeSection === 'LEDGER' && (
          <TransactionLedger
            transactions={transactions}
            onOpenReceipt={(tx) => setReceiptModalTx(tx)}
            onInspectPayload={handleInspectPayload}
            onSelectForPhone={(tx) => {
              setActiveTxId(tx.checkoutRequestId);
              setActiveSection('TERMINAL');
            }}
            onRefreshQuery={handleRefreshQuery}
          />
        )}

        {/* VIEW 3: DARAJA 2.0 API PAYLOAD INSPECTOR */}
        {activeSection === 'INSPECTOR' && (
          <DarajaInspector
            selectedTransaction={inspectedTransaction}
            allTransactions={transactions}
            onSelectTransaction={(tx) => setInspectedTxId(tx.checkoutRequestId)}
            config={config}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-12">
        <div className="max-w-[1320px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00A651]" />
            <span>
              Safaricom Daraja 2.0 Lipa Na M-Pesa Online (STK Push) · Standard ISO/KE MSISDN &
              Passkey Spec
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSection('TERMINAL')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Checkout Terminal
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveSection('LEDGER')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Reconciliation Ledger
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveSection('INSPECTOR')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Webhook Inspector
            </button>
          </div>
        </div>
      </footer>

      {/* Printable Official M-Pesa Receipt Modal */}
      <ReceiptModal
        transaction={receiptModalTx}
        onClose={() => setReceiptModalTx(null)}
      />

      {/* Real Money Safaricom Daraja Guide Modal */}
      <RealMoneyGuideModal
        isOpen={isRealMoneyModalOpen}
        onClose={() => setIsRealMoneyModalOpen(false)}
        config={config}
      />
    </div>
  );
}

export default App;
