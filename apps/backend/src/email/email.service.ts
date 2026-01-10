import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: Transporter | null = null;

    constructor(private configService: ConfigService) {
        this.initializeTransporter();
    }

    /**
     * Initialize email transporter with SMTP settings
     */
    private initializeTransporter() {
        const emailHost = this.configService.get<string>('EMAIL_HOST');
        const emailPort = this.configService.get<number>('EMAIL_PORT');
        const emailUser = this.configService.get<string>('EMAIL_USER');
        const emailPassword = this.configService.get<string>('EMAIL_PASSWORD');

        // Check if email is configured
        if (!emailHost || !emailUser || !emailPassword) {
            this.logger.warn('⚠️ Email service not configured. Emails will be logged to console.');
            this.logger.warn('To enable email sending, add these to your .env:');
            this.logger.warn('  EMAIL_HOST=smtp.gmail.com');
            this.logger.warn('  EMAIL_PORT=587');
            this.logger.warn('  EMAIL_USER=your-email@gmail.com');
            this.logger.warn('  EMAIL_PASSWORD=your-app-password');
            this.logger.warn('  EMAIL_FROM=noreply@yourwebsite.com');
            this.logger.warn('');
            this.logger.warn('📧 For Gmail: https://support.google.com/accounts/answer/185833');
            return;
        }

        try {
            this.transporter = nodemailer.createTransport({
                host: emailHost,
                port: emailPort || 587,
                secure: emailPort === 465, // true for port 465, false for other ports (587, etc.)
                auth: {
                    user: emailUser,
                    pass: emailPassword,
                },
                tls: {
                    rejectUnauthorized: false, // Allow self-signed certificates (for development)
                },
            });

            // Verify transporter connection
            this.transporter.verify((error) => {
                if (error) {
                    this.logger.error('❌ Email transporter verification failed:', error.message);
                    this.transporter = null;
                } else {
                    this.logger.log(`✅ Email service ready! Sending from: ${emailUser}`);
                }
            });
        } catch (error) {
            this.logger.error('❌ Failed to initialize email transporter:', error);
            this.transporter = null;
        }
    }

    /**
     * Send email verification
     */
    async sendVerificationEmail(email: string, token: string, userName: string): Promise<void> {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
        const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

        const html = this.getVerificationEmailTemplate(userName, verificationUrl);
        const text = `Xin chào ${userName}!\n\nCảm ơn bạn đã đăng ký tài khoản tại Web Truyện Tiến Hùng.\n\nĐể kích hoạt tài khoản của bạn, vui lòng truy cập link sau:\n${verificationUrl}\n\nLink này sẽ hết hạn sau 24 giờ.\n\nTrân trọng,\nĐội ngũ Web Truyện Tiến Hùng`;

        await this.sendEmail({
            to: email,
            subject: '🎉 Xác thực tài khoản - Web Truyện Tiến Hùng',
            html,
            text,
        });
    }

    /**
     * Send welcome email after verification
     */
    async sendWelcomeEmail(email: string, userName: string): Promise<void> {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

        const html = this.getWelcomeEmailTemplate(userName, frontendUrl);
        const text = `Xin chào ${userName}!\n\nChào mừng bạn đã tham gia cộng đồng đọc truyện của chúng tôi!\n\nBạn có thể bắt đầu khám phá hàng ngàn câu chuyện hấp dẫn tại: ${frontendUrl}\n\nTrân trọng,\nĐội ngũ Web Truyện Tiến Hùng`;

        await this.sendEmail({
            to: email,
            subject: '🎊 Chào mừng bạn đến với Web Truyện Tiến Hùng!',
            html,
            text,
        });
    }

    /**
     * Send email (uses nodemailer if configured, otherwise logs to console)
     */
    private async sendEmail(options: EmailOptions): Promise<void> {
        const emailFrom = this.configService.get<string>('EMAIL_FROM') ||
            this.configService.get<string>('EMAIL_USER') ||
            'noreply@webtruyen.com';

        // If transporter is configured, send real email
        if (this.transporter) {
            try {
                const info = await this.transporter.sendMail({
                    from: `"Web Truyện Tiến Hùng" <${emailFrom}>`,
                    to: options.to,
                    subject: options.subject,
                    text: options.text,
                    html: options.html,
                });

                this.logger.log(`✅ Email sent successfully to ${options.to} (Message ID: ${info.messageId})`);
            } catch (error: any) {
                this.logger.error(`❌ Failed to send email to ${options.to}: ${error.message}`);
                // Don't throw error - log instead to prevent registration from failing
                // In production, you might want to queue failed emails for retry
            }
        } else {
            // Development mode: Log email to console
            this.logger.log(`
═══════════════════════════════════════════════════════════
📧 EMAIL (DEVELOPMENT MODE - NOT SENT)
═══════════════════════════════════════════════════════════
To: ${options.to}
Subject: ${options.subject}
───────────────────────────────────────────────────────────
${options.text || 'See HTML content below'}
───────────────────────────────────────────────────────────
Verification URL: ${this.extractUrl(options.text || options.html)}
═══════════════════════════════════════════════════════════
      `);
        }
    }

    /**
     * Extract URL from text/html for logging
     */
    private extractUrl(content: string): string {
        const urlMatch = content.match(/(https?:\/\/[^\s<]+)/);
        return urlMatch ? urlMatch[1] : 'Not found';
    }

    /**
     * Email verification template - Material Design inspired
     */
    private getVerificationEmailTemplate(userName: string, verificationUrl: string): string {
        return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác thực tài khoản</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 40px; border-bottom: 1px solid #e0e0e0;">
                            <h1 style="margin: 0; color: #1976d2; font-size: 24px; font-weight: 500; letter-spacing: 0.5px;">
                                Web Truyện Tiến Hùng
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 24px; color: #212121; font-size: 20px; font-weight: 500; line-height: 1.4;">
                                Xác thực địa chỉ email của bạn
                            </h2>
                            
                            <p style="margin: 0 0 16px; color: #757575; font-size: 16px; line-height: 1.6;">
                                Xin chào <strong style="color: #212121;">${userName}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 24px; color: #757575; font-size: 16px; line-height: 1.6;">
                                Cảm ơn bạn đã đăng ký tài khoản tại Web Truyện Tiến Hùng. 
                                Để hoàn tất quá trình đăng ký, vui lòng xác nhận địa chỉ email của bạn bằng cách nhấp vào nút bên dưới.
                            </p>
                            
                            <!-- Button -->
                            <table role="presentation" style="margin: 32px 0;">
                                <tr>
                                    <td style="border-radius: 4px; background-color: #1976d2;">
                                        <a href="${verificationUrl}" 
                                           style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                                            Xác thực email
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0; color: #9e9e9e; font-size: 14px; line-height: 1.6;">
                                Hoặc sao chép và dán đường dẫn sau vào trình duyệt:
                            </p>
                            <p style="margin: 8px 0 0; padding: 12px; background-color: #f5f5f5; border-radius: 4px; word-break: break-all;">
                                <a href="${verificationUrl}" style="color: #1976d2; text-decoration: none; font-size: 13px;">
                                    ${verificationUrl}
                                </a>
                            </p>
                            
                            <!-- Info Box -->
                            <div style="margin: 32px 0 0; padding: 16px; background-color: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
                                <p style="margin: 0; color: #616161; font-size: 14px; line-height: 1.5;">
                                    <strong style="color: #212121;">Lưu ý quan trọng:</strong><br>
                                    Đường dẫn này sẽ hết hiệu lực sau 24 giờ. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e0e0e0; border-radius: 0 0 4px 4px;">
                            <p style="margin: 0 0 8px; color: #9e9e9e; font-size: 13px; line-height: 1.5;">
                                Email này được gửi tự động, vui lòng không trả lời.
                            </p>
                            <p style="margin: 0; color: #bdbdbd; font-size: 12px;">
                                © 2026 Web Truyện Tiến Hùng. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Security Info -->
                <table role="presentation" style="max-width: 600px; margin: 24px auto 0;">
                    <tr>
                        <td style="padding: 0 20px;">
                            <p style="margin: 0; color: #9e9e9e; font-size: 12px; line-height: 1.5; text-align: center;">
                                Vì lý do bảo mật, đường dẫn xác thực chỉ có thể sử dụng một lần và sẽ hết hạn sau 24 giờ.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
    }

    /**
     * Welcome email template - Material Design inspired
     */
    private getWelcomeEmailTemplate(userName: string, frontendUrl: string): string {
        return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chào mừng</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);">
                    
                    <!-- Header with success indicator -->
                    <tr>
                        <td style="padding: 40px 40px 32px; text-align: center; border-bottom: 1px solid #e0e0e0;">
                            <div style="width: 64px; height: 64px; margin: 0 auto 24px; background-color: #4caf50; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#ffffff"/>
                                </svg>
                            </div>
                            <h1 style="margin: 0; color: #1976d2; font-size: 24px; font-weight: 500; letter-spacing: 0.5px;">
                                Web Truyện Tiến Hùng
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 24px; color: #212121; font-size: 20px; font-weight: 500; line-height: 1.4; text-align: center;">
                                Xác thực thành công
                            </h2>
                            
                            <p style="margin: 0 0 16px; color: #757575; font-size: 16px; line-height: 1.6;">
                                Xin chào <strong style="color: #212121;">${userName}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 32px; color: #757575; font-size: 16px; line-height: 1.6;">
                                Tài khoản của bạn đã được kích hoạt thành công. Bạn có thể bắt đầu sử dụng đầy đủ các tính năng của chúng tôi.
                            </p>
                            
                            <!-- Features List -->
                            <div style="margin: 32px 0; padding: 24px; background-color: #fafafa; border-radius: 4px;">
                                <h3 style="margin: 0 0 16px; color: #212121; font-size: 16px; font-weight: 500;">
                                    Bắt đầu với Web Truyện Tiến Hùng
                                </h3>
                                <table role="presentation" style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #757575; font-size: 14px; line-height: 1.6;">
                                            • Đọc truyện miễn phí không giới hạn
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #757575; font-size: 14px; line-height: 1.6;">
                                            • Theo dõi truyện yêu thích của bạn
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #757575; font-size: 14px; line-height: 1.6;">
                                            • Tương tác với cộng đồng độc giả
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #757575; font-size: 14px; line-height: 1.6;">
                                            • Lưu lịch sử đọc truyện
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #757575; font-size: 14px; line-height: 1.6;">
                                            • Nhận thông báo chapter mới
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="margin: 32px 0; width: 100%;">
                                <tr>
                                    <td style="text-align: center;">
                                        <table role="presentation" style="margin: 0 auto;">
                                            <tr>
                                                <td style="border-radius: 4px; background-color: #1976d2;">
                                                    <a href="${frontendUrl}" 
                                                       style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                                                        Khám phá ngay
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 32px 0 0; color: #9e9e9e; font-size: 14px; line-height: 1.6; text-align: center;">
                                Chúc bạn có những trải nghiệm thú vị!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e0e0e0; border-radius: 0 0 4px 4px;">
                            <p style="margin: 0 0 8px; color: #9e9e9e; font-size: 13px; line-height: 1.5;">
                                Email này được gửi tự động, vui lòng không trả lời.
                            </p>
                            <p style="margin: 0; color: #bdbdbd; font-size: 12px;">
                                © 2026 Web Truyện Tiến Hùng. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
    }
}
