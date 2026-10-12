import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type TransactionType = 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline';
type TransactionStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'FAILED' | 'TIMEOUT';

interface DarajaStkPushRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: TransactionType;
  Amount: number;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

interface DarajaStkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface DarajaStkCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
}

interface MpesaTransaction {
  id: string;
  merchantRequestId: string;
  checkoutRequestId: string;
  phoneNumber: string;
  customerName: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  transactionType: TransactionType;
  shortCode: string;
  status: TransactionStatus;
  resultCode: number | null;
  resultDesc: string;
  mpesaReceiptNumber: string | null;
  transactionDate: string;
  createdAt: string;
  completedAt: string | null;
  mode: 'LIVE_DARAJA' | 'SANDBOX_SIMULATOR';
  rawRequest: DarajaStkPushRequest;
  rawResponse: DarajaStkPushResponse;
  rawCallback: DarajaStkCallback | null;
  latencyMs: number;
}

const DEFAULT_SHORTCODE = (process.env.MPESA_SHORTCODE || '174379').replace(/^MPESA_SHORTCODE=/, '').trim();
const DEFAULT_PASSKEY =
  (process.env.MPESA_PASSKEY ||
  'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919').replace(/^MPESA_PASSKEY=/, '').trim();
const MPESA_ENV =
  process.env.MPESA_ENV?.toLowerCase() === 'production' ? 'production' : 'sandbox';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function getSanitizedCallbackUrl(): string {
  let raw = process.env.MPESA_CALLBACK_URL?.trim();
  if (raw && raw.startsWith('MPESA_CALLBACK_URL=')) {
    raw = raw.replace(/^MPESA_CALLBACK_URL=/, '').trim();
  }
  if (!raw || raw.includes('<your-live-domain.com>')) {
    return `${APP_URL}/api/mpesa/callback`;
  }
  return raw;
}

function formatDarajaTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function generateDarajaPassword(shortCode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
}

function generateMpesaReceipt(): string {
  // Authentic 10-character alphanumeric Safaricom M-Pesa receipt code (e.g., UJK84M9P2W)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'UJ';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function normalizeKenyanPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('07') && digits.length === 10) {
    return '254' + digits.slice(1);
  }
  if (digits.startsWith('01') && digits.length === 10) {
    return '254' + digits.slice(1);
  }
  if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) {
    return '254' + digits;
  }
  if (digits.startsWith('254') && digits.length === 12) {
    return digits;
  }
  return digits;
}

const KENYAN_NAMES: Record<string, string> = {
  '254712345678': 'Wanjiku Kamau',
  '254722891044': 'Brian Ochieng',
  '254708332190': 'Faith Chebet',
  '254799114502': 'Kevin Mutua',
  '254110448921': 'Amina Hassan',
  '254745609123': 'David Kiprop',
};

function resolveCustomerName(phone: string): string {
  if (KENYAN_NAMES[phone]) return KENYAN_NAMES[phone];
  const names = [
    'James Mwangi',
    'Grace Njeri',
    'Kelvin Omondi',
    'Mercy Wambui',
    'Collins Kipchoge',
    'Brenda Akinyi',
    'Samuel Njoroge',
    'Halima Abdi',
  ];
  const hash = phone.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return names[hash % names.length];
}

function createSeedTransaction(
  offsetMinutes: number,
  phone: string,
  amount: number,
  accountReference: string,
  transactionDesc: string,
  transactionType: TransactionType,
  shortCode: string,
  status: TransactionStatus,
  receiptNumber: string | null,
  resultCode: number,
  resultDesc: string,
  latencyMs: number
): MpesaTransaction {
  const createdDate = new Date(Date.now() - offsetMinutes * 60 * 1000);
  const completedDate = new Date(createdDate.getTime() + latencyMs);
  const ts = formatDarajaTimestamp(createdDate);
  const completedTs = formatDarajaTimestamp(completedDate);
  const merchantRequestId = `29115-34620561-${Math.floor(1000 + Math.random() * 9000)}`;
  const checkoutRequestId = `ws_CO_${ts}${Math.floor(100000 + Math.random() * 899999)}`;
  const password = generateDarajaPassword(shortCode, DEFAULT_PASSKEY, ts);

  const rawRequest: DarajaStkPushRequest = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: ts,
    TransactionType: transactionType,
    Amount: amount,
    PartyA: phone,
    PartyB: shortCode,
    PhoneNumber: phone,
    CallBackURL: `${APP_URL}/api/mpesa/callback`,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc,
  };

  const rawResponse: DarajaStkPushResponse = {
    MerchantRequestID: merchantRequestId,
    CheckoutRequestID: checkoutRequestId,
    ResponseCode: '0',
    ResponseDescription: 'Success. Request accepted for processing',
    CustomerMessage: 'Success. Request accepted for processing',
  };

  const rawCallback: DarajaStkCallback = {
    Body: {
      stkCallback: {
        MerchantRequestID: merchantRequestId,
        CheckoutRequestID: checkoutRequestId,
        ResultCode: resultCode,
        ResultDesc: resultDesc,
        ...(status === 'COMPLETED' && receiptNumber
          ? {
              CallbackMetadata: {
                Item: [
                  { Name: 'Amount', Value: amount },
                  { Name: 'MpesaReceiptNumber', Value: receiptNumber },
                  { Name: 'TransactionDate', Value: Number(completedTs) },
                  { Name: 'PhoneNumber', Value: Number(phone) },
                ],
              },
            }
          : {}),
      },
    },
  };

  return {
    id: checkoutRequestId,
    merchantRequestId,
    checkoutRequestId,
    phoneNumber: phone,
    customerName: resolveCustomerName(phone),
    amount,
    accountReference,
    transactionDesc,
    transactionType,
    shortCode,
    status,
    resultCode,
    resultDesc,
    mpesaReceiptNumber: receiptNumber,
    transactionDate: completedTs,
    createdAt: createdDate.toISOString(),
    completedAt: completedDate.toISOString(),
    mode: 'SANDBOX_SIMULATOR',
    rawRequest,
    rawResponse,
    rawCallback,
    latencyMs,
  };
}

// Initial realistic Kenyan merchant ledger
const transactions: MpesaTransaction[] = [
  createSeedTransaction(
    4,
    '254712345678',
    2450,
    'INV-NBO-8841',
    'Naivas Supermarket Westlands',
    'CustomerBuyGoodsOnline',
    '542542',
    'COMPLETED',
    'UJK92L4W8P',
    0,
    'The service request is processed successfully.',
    4200
  ),
  createSeedTransaction(
    18,
    '254722891044',
    1500,
    'KPLC-142899012',
    'Kenya Power Prepaid Token',
    'CustomerPayBillOnline',
    '888880',
    'COMPLETED',
    'UJK71M3X9Q',
    0,
    'The service request is processed successfully.',
    5100
  ),
  createSeedTransaction(
    37,
    '254708332190',
    4499,
    'ZUKU-089142',
    'Zuku Fiber 40Mbps Monthly',
    'CustomerPayBillOnline',
    '320320',
    'COMPLETED',
    'UJK58R7K2N',
    0,
    'The service request is processed successfully.',
    3850
  ),
  createSeedTransaction(
    64,
    '254799114502',
    650,
    'EXP-99201A',
    'Nairobi Expressway ETC Topup',
    'CustomerPayBillOnline',
    '174379',
    'CANCELLED',
    null,
    1032,
    'Request cancelled by user',
    6900
  ),
  createSeedTransaction(
    115,
    '254110448921',
    8900,
    'JUMIA-KE-3019',
    'Jumia Kenya Order Checkout',
    'CustomerPayBillOnline',
    '512800',
    'COMPLETED',
    'UJK34V9D1M',
    0,
    'The service request is processed successfully.',
    4600
  ),
  createSeedTransaction(
    180,
    '254745609123',
    3200,
    'JAVA-KIM-092',
    'Java House Kimathi Street',
    'CustomerBuyGoodsOnline',
    '174379',
    'FAILED',
    null,
    1,
    'The balance is insufficient for the transaction.',
    4100
  ),
];

async function getLiveDarajaAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error('MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are not set');
  }
  const baseUrl =
    MPESA_ENV === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');

  const response = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Daraja OAuth failed (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Get Daraja Configuration & Endpoint Status
  app.get('/api/mpesa/config', (_req, res) => {
    const hasLiveCredentials = Boolean(
      process.env.MPESA_CONSUMER_KEY &&
        process.env.MPESA_CONSUMER_SECRET &&
        process.env.MPESA_CONSUMER_KEY !== 'MY_CONSUMER_KEY'
    );
    const baseUrl =
      MPESA_ENV === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

    res.json({
      hasLiveCredentials,
      environment: MPESA_ENV,
      shortCode: DEFAULT_SHORTCODE,
      passkeyPreview: `${DEFAULT_PASSKEY.slice(0, 8)}...${DEFAULT_PASSKEY.slice(-6)}`,
      callbackUrl: getSanitizedCallbackUrl(),
      oauthEndpoint: `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      stkPushEndpoint: `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      stkQueryEndpoint: `${baseUrl}/mpesa/stkpushquery/v1/query`,
    });
  });

  // 2. List all M-Pesa Transactions
  app.get('/api/mpesa/transactions', (_req, res) => {
    res.json({ transactions });
  });

  // 3. Initiate STK Push (Lipa Na M-Pesa Online)
  app.post('/api/mpesa/stkpush', async (req, res) => {
    try {
      const {
        phoneNumber,
        amount,
        accountReference = 'INV-001',
        transactionDesc = 'M-Pesa STK Push Payment',
        transactionType = 'CustomerPayBillOnline',
        shortCode = DEFAULT_SHORTCODE,
        customerName,
      } = req.body;

      const normalizedPhone = normalizeKenyanPhone(String(phoneNumber || ''));
      if (!/^254(7|1)\d{8}$/.test(normalizedPhone)) {
        return res.status(400).json({
          error:
            'Invalid Kenyan MSISDN format. Expected 07XX XXX XXX, 01XX XXX XXX, or 2547XX XXX XXX.',
        });
      }

      const numericAmount = Math.round(Number(amount));
      if (!numericAmount || numericAmount < 1 || numericAmount > 250000) {
        return res.status(400).json({
          error: 'Amount must be between KES 1 and KES 250,000 per M-Pesa transaction limit.',
        });
      }

      const timestamp = formatDarajaTimestamp(new Date());
      const password = generateDarajaPassword(shortCode, DEFAULT_PASSKEY, timestamp);
      const callbackUrl = getSanitizedCallbackUrl();

      const stkPayload: DarajaStkPushRequest = {
        BusinessShortCode: String(shortCode),
        Password: password,
        Timestamp: timestamp,
        TransactionType:
          transactionType === 'CustomerBuyGoodsOnline'
            ? 'CustomerBuyGoodsOnline'
            : 'CustomerPayBillOnline',
        Amount: numericAmount,
        PartyA: normalizedPhone,
        PartyB: String(shortCode),
        PhoneNumber: normalizedPhone,
        CallBackURL: callbackUrl,
        AccountReference: String(accountReference).slice(0, 12),
        TransactionDesc: String(transactionDesc).slice(0, 32),
      };

      const hasLiveCredentials = Boolean(
        process.env.MPESA_CONSUMER_KEY &&
          process.env.MPESA_CONSUMER_SECRET &&
          process.env.MPESA_CONSUMER_KEY !== 'MY_CONSUMER_KEY'
      );

      let stkResponse: DarajaStkPushResponse;
      let mode: 'LIVE_DARAJA' | 'SANDBOX_SIMULATOR' = 'SANDBOX_SIMULATOR';

      if (hasLiveCredentials) {
        try {
          const token = await getLiveDarajaAccessToken();
          const baseUrl =
            MPESA_ENV === 'production'
              ? 'https://api.safaricom.co.ke'
              : 'https://sandbox.safaricom.co.ke';

          console.log(`[Daraja] Dispatching Live STK Push to ${baseUrl} for ${normalizedPhone}`);
          const liveRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(stkPayload),
          });

          const liveData = (await liveRes.json()) as any;
          console.log('[Daraja] Response from Safaricom:', liveData);

          if (liveRes.ok && liveData.ResponseCode === '0') {
            stkResponse = liveData as DarajaStkPushResponse;
            mode = 'LIVE_DARAJA';
          } else {
            const errorMsg =
              liveData.errorMessage ||
              liveData.ResponseDescription ||
              `Safaricom Daraja Error (${liveRes.status})`;
            return res.status(400).json({
              error: errorMsg,
              details: liveData,
            });
          }
        } catch (err: any) {
          console.error('[Daraja] Exception during STK Push:', err);
          return res.status(500).json({
            error: `Failed to communicate with Safaricom Daraja (${MPESA_ENV}): ${err.message}`,
          });
        }
      } else {
        stkResponse = {
          MerchantRequestID: `29115-34620561-${Math.floor(1000 + Math.random() * 9000)}`,
          CheckoutRequestID: `ws_CO_${timestamp}${Math.floor(100000 + Math.random() * 899999)}`,
          ResponseCode: '0',
          ResponseDescription: 'Success. Request accepted for processing',
          CustomerMessage: 'Success. Request accepted for processing',
        };
      }

      const newTx: MpesaTransaction = {
        id: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        phoneNumber: normalizedPhone,
        customerName: customerName?.trim() || resolveCustomerName(normalizedPhone),
        amount: numericAmount,
        accountReference: stkPayload.AccountReference,
        transactionDesc: stkPayload.TransactionDesc,
        transactionType: stkPayload.TransactionType,
        shortCode: stkPayload.BusinessShortCode,
        status: 'PENDING',
        resultCode: null,
        resultDesc: 'Waiting for customer M-Pesa PIN authorization on SIM Toolkit...',
        mpesaReceiptNumber: null,
        transactionDate: timestamp,
        createdAt: new Date().toISOString(),
        completedAt: null,
        mode,
        rawRequest: stkPayload,
        rawResponse: stkResponse,
        rawCallback: null,
        latencyMs: 0,
      };

      transactions.unshift(newTx);

      return res.status(200).json({
        transaction: newTx,
        darajaResponse: stkResponse,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to initiate STK Push';
      return res.status(500).json({ error: msg });
    }
  });

  // 4. Interactive SIM Toolkit Action / Webhook Callback Simulator
  // Allows user on the interactive phone screen to Authorize (PIN), Cancel (1032), Fail Insufficient Funds (1), or Timeout (1037)
  app.post('/api/mpesa/simulate-action', (req, res) => {
    const { checkoutRequestId, action, pin } = req.body as {
      checkoutRequestId: string;
      action: 'AUTHORIZE' | 'CANCEL' | 'INSUFFICIENT_FUNDS' | 'WRONG_PIN' | 'TIMEOUT';
      pin?: string;
    };

    const tx = transactions.find((t) => t.checkoutRequestId === checkoutRequestId);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (tx.status !== 'PENDING') {
      return res.json({ transaction: tx });
    }

    const now = new Date();
    const completedTs = formatDarajaTimestamp(now);
    const latencyMs = Math.max(850, now.getTime() - new Date(tx.createdAt).getTime());

    let resultCode = 0;
    let resultDesc = 'The service request is processed successfully.';
    let status: TransactionStatus = 'COMPLETED';
    let receipt: string | null = null;

    if (action === 'AUTHORIZE') {
      if (pin === '0000') {
        resultCode = 2001;
        resultDesc = 'The initiator information is invalid (Wrong M-Pesa PIN entered).';
        status = 'FAILED';
      } else {
        resultCode = 0;
        resultDesc = 'The service request is processed successfully.';
        status = 'COMPLETED';
        receipt = generateMpesaReceipt();
      }
    } else if (action === 'CANCEL') {
      resultCode = 1032;
      resultDesc = 'Request cancelled by user';
      status = 'CANCELLED';
    } else if (action === 'INSUFFICIENT_FUNDS') {
      resultCode = 1;
      resultDesc = 'The balance is insufficient for the transaction.';
      status = 'FAILED';
    } else if (action === 'WRONG_PIN') {
      resultCode = 2001;
      resultDesc = 'The initiator information is invalid.';
      status = 'FAILED';
    } else if (action === 'TIMEOUT') {
      resultCode = 1037;
      resultDesc = 'DS timeout user cannot be reached';
      status = 'TIMEOUT';
    }

    const callbackPayload: DarajaStkCallback = {
      Body: {
        stkCallback: {
          MerchantRequestID: tx.merchantRequestId,
          CheckoutRequestID: tx.checkoutRequestId,
          ResultCode: resultCode,
          ResultDesc: resultDesc,
          ...(status === 'COMPLETED' && receipt
            ? {
                CallbackMetadata: {
                  Item: [
                    { Name: 'Amount', Value: tx.amount },
                    { Name: 'MpesaReceiptNumber', Value: receipt },
                    { Name: 'TransactionDate', Value: Number(completedTs) },
                    { Name: 'PhoneNumber', Value: Number(tx.phoneNumber) },
                  ],
                },
              }
            : {}),
        },
      },
    };

    tx.status = status;
    tx.resultCode = resultCode;
    tx.resultDesc = resultDesc;
    tx.mpesaReceiptNumber = receipt;
    tx.transactionDate = completedTs;
    tx.completedAt = now.toISOString();
    tx.rawCallback = callbackPayload;
    tx.latencyMs = latencyMs;

    return res.json({
      transaction: tx,
      callbackPayload,
    });
  });

  // 5. Real Safaricom Daraja Webhook Callback Endpoint
  app.post('/api/mpesa/callback', (req, res) => {
    const body = req.body as DarajaStkCallback;
    const stkCallback = body?.Body?.stkCallback;

    if (!stkCallback) {
      return res.status(400).json({ ResultCode: 1, ResultDesc: 'Malformed callback payload' });
    }

    const tx = transactions.find((t) => t.checkoutRequestId === stkCallback.CheckoutRequestID);
    if (tx) {
      const now = new Date();
      tx.resultCode = stkCallback.ResultCode;
      tx.resultDesc = stkCallback.ResultDesc;
      tx.completedAt = now.toISOString();
      tx.rawCallback = body;
      tx.latencyMs = Math.max(500, now.getTime() - new Date(tx.createdAt).getTime());

      if (stkCallback.ResultCode === 0) {
        tx.status = 'COMPLETED';
        const items = stkCallback.CallbackMetadata?.Item || [];
        const receiptItem = items.find((i) => i.Name === 'MpesaReceiptNumber');
        const dateItem = items.find((i) => i.Name === 'TransactionDate');
        tx.mpesaReceiptNumber = receiptItem?.Value ? String(receiptItem.Value) : generateMpesaReceipt();
        if (dateItem?.Value) {
          tx.transactionDate = String(dateItem.Value);
        }
      } else if (stkCallback.ResultCode === 1032) {
        tx.status = 'CANCELLED';
      } else if (stkCallback.ResultCode === 1037) {
        tx.status = 'TIMEOUT';
      } else {
        tx.status = 'FAILED';
      }
    }

    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  });

  // 6. Query STK Push Status (/mpesa/stkpushquery/v1/query)
  app.post('/api/mpesa/query', async (req, res) => {
    const { checkoutRequestId } = req.body as { checkoutRequestId: string };
    const tx = transactions.find((t) => t.checkoutRequestId === checkoutRequestId);
    if (!tx) {
      return res.status(404).json({ error: 'CheckoutRequestID not found' });
    }

    const hasLiveCredentials = Boolean(
      process.env.MPESA_CONSUMER_KEY &&
        process.env.MPESA_CONSUMER_SECRET &&
        process.env.MPESA_CONSUMER_KEY !== 'MY_CONSUMER_KEY'
    );

    // If pending and in live mode, poll Safaricom's live query API
    if (tx.status === 'PENDING' && tx.mode === 'LIVE_DARAJA' && hasLiveCredentials) {
      try {
        const token = await getLiveDarajaAccessToken();
        const baseUrl =
          MPESA_ENV === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
        const queryTimestamp = formatDarajaTimestamp(new Date());
        const queryPassword = generateDarajaPassword(tx.shortCode, DEFAULT_PASSKEY, queryTimestamp);

        const liveQueryRes = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            BusinessShortCode: tx.shortCode,
            Password: queryPassword,
            Timestamp: queryTimestamp,
            CheckoutRequestID: tx.checkoutRequestId,
          }),
        });

        if (liveQueryRes.ok) {
          const queryData = (await liveQueryRes.json()) as any;
          if (queryData.ResultCode !== undefined && queryData.ResultCode !== '4999') {
            const resCode = Number(queryData.ResultCode);
            tx.resultCode = resCode;
            tx.resultDesc = queryData.ResultDesc || 'Processed';
            if (resCode === 0) {
              tx.status = 'COMPLETED';
              if (!tx.mpesaReceiptNumber) {
                tx.mpesaReceiptNumber = generateMpesaReceipt();
              }
            } else if (resCode === 1032) {
              tx.status = 'CANCELLED';
            } else if (resCode === 1037) {
              tx.status = 'TIMEOUT';
            } else {
              tx.status = 'FAILED';
            }
            tx.completedAt = new Date().toISOString();
          }
        }
      } catch (queryErr) {
        console.warn('[Daraja] Live query error:', queryErr);
      }
    }

    return res.json({
      ResponseCode: '0',
      ResponseDescription: 'The service request has been accepted successfully',
      MerchantRequestID: tx.merchantRequestId,
      CheckoutRequestID: tx.checkoutRequestId,
      ResultCode: tx.resultCode !== null ? String(tx.resultCode) : '4999',
      ResultDesc: tx.resultDesc,
      transaction: tx,
    });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`M-Pesa STK Push server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
