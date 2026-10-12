export type TransactionType = 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline';

export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'FAILED' | 'TIMEOUT';

export interface DarajaStkPushRequest {
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

export interface DarajaStkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface DarajaCallbackItem {
  Name: string;
  Value?: string | number;
}

export interface DarajaStkCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: DarajaCallbackItem[];
      };
    };
  };
}

export interface MpesaTransaction {
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

export interface DarajaConfigStatus {
  hasLiveCredentials: boolean;
  environment: 'sandbox' | 'production';
  shortCode: string;
  passkeyPreview: string;
  callbackUrl: string;
  oauthEndpoint: string;
  stkPushEndpoint: string;
  stkQueryEndpoint: string;
}

export interface CheckoutPreset {
  id: string;
  title: string;
  category: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  transactionType: TransactionType;
  shortCode: string;
  merchantName: string;
}
