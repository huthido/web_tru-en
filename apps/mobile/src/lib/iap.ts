// Thin wrapper around react-native-iap for buying coin packages on
// Apple App Store / Google Play. The high-level flow:
//
//   1. `initIap()` once at app launch (or lazily on first WalletScreen mount).
//   2. `fetchProducts(skus)` to populate native product info (price/title).
//   3. `purchase(sku)` → opens the native sheet, resolves with the purchase
//      payload (different shape per platform).
//   4. Caller posts the payload to backend (`PaymentsApi.redeemAppleIap` /
//      `redeemGooglePlay`).
//   5. On success, `finish(purchase)` consumes the purchase on Android
//      (mandatory) and acks on iOS.
//
// IAP CANNOT run in Expo Go — needs a custom dev build (`npx expo run:ios` /
// `run:android`). The module loads lazily so the JS bundle still builds in
// Expo Go; calling any function in Expo Go throws a friendly error.

import { Platform } from 'react-native';

export type IapPurchase =
  | {
      kind: 'apple';
      productId: string;
      transactionId: string;
      receipt: string;
      raw: any;
    }
  | {
      kind: 'google';
      productId: string;
      purchaseToken: string;
      raw: any;
    };

let _rniap: any | null = null;
let _initialized = false;
let _purchaseListener: { remove: () => void } | null = null;
let _errorListener: { remove: () => void } | null = null;
let _pendingResolve: ((p: IapPurchase) => void) | null = null;
let _pendingReject: ((e: Error) => void) | null = null;

function loadModule(): any {
  if (_rniap) return _rniap;
  try {
    _rniap = require('react-native-iap');
  } catch (e: any) {
    throw new Error(
      'react-native-iap chưa được liên kết native. Cần dev build (`npx expo run:ios|android`) — không chạy được trong Expo Go.',
    );
  }
  return _rniap;
}

export async function initIap(): Promise<void> {
  if (_initialized) return;
  const iap = loadModule();
  await iap.initConnection();
  _purchaseListener = iap.purchaseUpdatedListener(async (raw: any) => {
    if (!_pendingResolve) return; // unsolicited (e.g. previous restore) — caller will refetch
    try {
      const normalized = normalizePurchase(raw);
      _pendingResolve(normalized);
    } catch (e: any) {
      _pendingReject?.(e);
    } finally {
      _pendingResolve = null;
      _pendingReject = null;
    }
  });
  _errorListener = iap.purchaseErrorListener((err: any) => {
    if (_pendingReject) {
      _pendingReject(new Error(err?.message || err?.code || 'IAP purchase error'));
      _pendingResolve = null;
      _pendingReject = null;
    }
  });
  _initialized = true;
}

export async function endIap(): Promise<void> {
  if (!_initialized) return;
  const iap = loadModule();
  _purchaseListener?.remove();
  _errorListener?.remove();
  _purchaseListener = null;
  _errorListener = null;
  try {
    await iap.endConnection();
  } catch {
    // ignore
  }
  _initialized = false;
}

export async function fetchProducts(skus: string[]): Promise<
  Array<{ productId: string; title: string; description: string; localizedPrice: string; price: string; currency: string }>
> {
  if (skus.length === 0) return [];
  await initIap();
  const iap = loadModule();
  const products = await iap.getProducts({ skus });
  return products.map((p: any) => ({
    productId: p.productId ?? p.id,
    title: p.title ?? '',
    description: p.description ?? '',
    localizedPrice: p.localizedPrice ?? p.price ?? '',
    price: p.price ?? '',
    currency: p.currency ?? '',
  }));
}

/**
 * Open the native purchase sheet and resolve with the canonical purchase
 * payload. Throws if the user cancels, IAP is unavailable, or the native
 * SDK errors. The caller is responsible for posting the payload to the
 * server, then calling `finish(purchase)` once credited.
 */
export function purchase(sku: string): Promise<IapPurchase> {
  return new Promise<IapPurchase>(async (resolve, reject) => {
    try {
      await initIap();
      const iap = loadModule();
      if (_pendingResolve) {
        return reject(new Error('Đang có giao dịch chờ — vui lòng đợi.'));
      }
      _pendingResolve = resolve;
      _pendingReject = reject;
      await iap.requestPurchase(
        Platform.OS === 'ios' ? { sku } : { skus: [sku] },
      );
    } catch (e: any) {
      _pendingResolve = null;
      _pendingReject = null;
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

/**
 * Finalize a purchase after the server has credited the wallet. On Android
 * this CONSUMES the product (so the user can buy it again — required for
 * consumables). On iOS this finishes the transaction so StoreKit stops
 * delivering it on every app launch.
 */
export async function finish(purchase: IapPurchase): Promise<void> {
  const iap = loadModule();
  await iap.finishTransaction({ purchase: purchase.raw, isConsumable: true });
}

function normalizePurchase(raw: any): IapPurchase {
  if (Platform.OS === 'ios') {
    const transactionId = raw.transactionId ?? raw.originalTransactionIdentifierIOS;
    const receipt = raw.transactionReceipt ?? raw.jwsRepresentationIOS ?? '';
    if (!transactionId) throw new Error('Apple purchase missing transactionId');
    return {
      kind: 'apple',
      productId: raw.productId,
      transactionId: String(transactionId),
      receipt: String(receipt),
      raw,
    };
  }
  // Android (Google Play)
  const purchaseToken = raw.purchaseToken ?? raw.purchaseTokenAndroid;
  if (!purchaseToken) throw new Error('Google purchase missing purchaseToken');
  return {
    kind: 'google',
    productId: raw.productId ?? (Array.isArray(raw.productIds) ? raw.productIds[0] : undefined),
    purchaseToken: String(purchaseToken),
    raw,
  };
}
