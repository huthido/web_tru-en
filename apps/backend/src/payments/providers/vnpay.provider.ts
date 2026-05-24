import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface VnpayCreateUrlInput {
  txnRef: string;
  amountVND: number;
  orderInfo: string;
  ipAddr: string;
  bankCode?: string;
  locale?: 'vn' | 'en';
}

export interface VnpayVerifyResult {
  valid: boolean;
  success: boolean;
  txnRef?: string;
  amountVND?: number;
  providerTxn?: string;
  responseCode?: string;
  rawParams: Record<string, string>;
}

@Injectable()
export class VnpayProvider implements OnModuleInit {
  private readonly logger = new Logger(VnpayProvider.name);
  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly payUrl: string;
  private readonly returnUrl: string;
  private readonly ipnUrl: string;

  constructor(private config: ConfigService) {
    this.tmnCode = this.config.get<string>('VNPAY_TMN_CODE') || '';
    this.hashSecret = this.config.get<string>('VNPAY_HASH_SECRET') || '';
    this.payUrl =
      this.config.get<string>('VNPAY_PAY_URL') ||
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.returnUrl = this.config.get<string>('VNPAY_RETURN_URL') || '';
    this.ipnUrl = this.config.get<string>('VNPAY_IPN_URL') || '';
  }

  onModuleInit() {
    if (!this.isConfigured()) {
      this.logger.warn(
        'VNPay chưa cấu hình — thiếu VNPAY_TMN_CODE/VNPAY_HASH_SECRET/VNPAY_RETURN_URL. ' +
          'Endpoint nạp xu sẽ trả 503 cho đến khi set đủ env vars.',
      );
    } else {
      this.logger.log(
        `VNPay configured — payUrl=${this.payUrl}, returnUrl=${this.returnUrl}`,
      );
    }
  }

  isConfigured(): boolean {
    return !!(this.tmnCode && this.hashSecret && this.returnUrl);
  }

  /**
   * Build the VNPay payment URL. VNPay expects amount in VND × 100.
   */
  buildPaymentUrl(input: VnpayCreateUrlInput): string {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Cổng thanh toán VNPay chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
      );
    }

    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const createDate = `${yyyy}${mm}${dd}${hh}${mi}${ss}`;

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Amount: (input.amountVND * 100).toString(),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: input.txnRef,
      vnp_OrderInfo: input.orderInfo,
      vnp_OrderType: 'other',
      vnp_Locale: input.locale || 'vn',
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: input.ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
    };
    if (input.bankCode) params.vnp_BankCode = input.bankCode;

    const signed = this.sortAndSign(params);
    // signed values đã URL-encoded; không encode lại tránh double-encode.
    const query = Object.entries(signed)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    return `${this.payUrl}?${query}`;
  }

  /**
   * Verify return/IPN params against the secure hash.
   *
   * VNPay sign trên chuỗi values đã URL-encoded (`encodeURIComponent` +
   * thay `%20` bằng `+`). Express query parser tự decode nên params nhận
   * được là raw — phải re-encode trước khi tính hash để khớp.
   */
  verifyCallback(params: Record<string, string>): VnpayVerifyResult {
    const rawHash = params['vnp_SecureHash'];
    if (!rawHash) {
      return { valid: false, success: false, rawParams: params };
    }

    const checkParams = { ...params };
    delete checkParams['vnp_SecureHash'];
    delete checkParams['vnp_SecureHashType'];

    const sorted = this.sortParams(checkParams);
    const signData = Object.entries(sorted)
      .map(([k, v]) => `${k}=${this.encodeValue(v)}`)
      .join('&');
    const computed = crypto
      .createHmac('sha512', this.hashSecret)
      .update(signData, 'utf-8')
      .digest('hex');

    const valid = computed.toLowerCase() === rawHash.toLowerCase();
    const responseCode = params['vnp_ResponseCode'];
    const transactionStatus = params['vnp_TransactionStatus'];
    // VNPay: ResponseCode "00" + TransactionStatus "00" means success
    const success = valid && responseCode === '00' && transactionStatus === '00';

    return {
      valid,
      success,
      txnRef: params['vnp_TxnRef'],
      amountVND: params['vnp_Amount'] ? Number(params['vnp_Amount']) / 100 : undefined,
      providerTxn: params['vnp_TransactionNo'],
      responseCode,
      rawParams: params,
    };
  }

  private sortParams(params: Record<string, string>): Record<string, string> {
    return Object.keys(params)
      .sort()
      .reduce<Record<string, string>>((acc, key) => {
        if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
          acc[key] = params[key];
        }
        return acc;
      }, {});
  }

  /**
   * Encode value đúng kiểu VNPay yêu cầu trong chữ ký: `encodeURIComponent`
   * rồi thay `%20` bằng `+` (theo Node.js sample chính thức của VNPay).
   * Sign trên raw → "Sai chữ ký" vì VNPay re-encode rồi sign trước khi so sánh.
   */
  private encodeValue(v: string): string {
    return encodeURIComponent(v).replace(/%20/g, '+');
  }

  private sortAndSign(params: Record<string, string>): Record<string, string> {
    const sorted = this.sortParams(params);
    const encoded: Record<string, string> = {};
    for (const k of Object.keys(sorted)) {
      encoded[k] = this.encodeValue(sorted[k]);
    }
    const signData = Object.entries(encoded)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    const hash = crypto
      .createHmac('sha512', this.hashSecret)
      .update(signData, 'utf-8')
      .digest('hex');
    return { ...encoded, vnp_SecureHash: hash };
  }
}
