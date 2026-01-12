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
    private emailUser: string | null = null;
    private emailHost: string | null = null;

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
        const emailFrom = this.configService.get<string>('EMAIL_FROM');

        // Store for later use
        this.emailHost = emailHost || null;
        this.emailUser = emailUser || null;

        // Check if email is configured
        if (!emailHost || !emailUser || !emailPassword) {
            this.logger.warn('⚠️ Email service not configured. Emails will be logged to console.');
            this.logger.warn('To enable email sending, add these to your .env:');
            this.logger.warn('  EMAIL_HOST=smtp.gmail.com');
            this.logger.warn('  EMAIL_PORT=587');
            this.logger.warn('  EMAIL_USER=your-email@gmail.com');
            this.logger.warn('  EMAIL_PASSWORD=your-app-password');
            this.logger.warn('  EMAIL_FROM=your-email@gmail.com (should match EMAIL_USER for Gmail)');
            this.logger.warn('');
            this.logger.warn('📧 For Gmail: https://support.google.com/accounts/answer/185833');
            return;
        }

        // 🔥 IMPORTANT: For Gmail SMTP, EMAIL_FROM must match EMAIL_USER
        const isGmail = emailHost.includes('gmail.com');
        if (isGmail && emailFrom && emailFrom !== emailUser) {
            this.logger.warn('⚠️ WARNING: Using Gmail SMTP but EMAIL_FROM does not match EMAIL_USER');
            this.logger.warn(`   EMAIL_USER: ${emailUser}`);
            this.logger.warn(`   EMAIL_FROM: ${emailFrom}`);
            this.logger.warn('   Gmail requires FROM address to match authenticated account.');
            this.logger.warn('   Will use EMAIL_USER as FROM address instead.');
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
        const text = `Xin chào ${userName}!\n\nCảm ơn bạn đã đăng ký tài khoản tại Web Truyện HungYeu.\n\nĐể kích hoạt tài khoản của bạn, vui lòng truy cập link sau:\n${verificationUrl}\n\nLink này sẽ hết hạn sau 24 giờ.\n\nTrân trọng,\nĐội ngũ Web Truyện HungYeu`;

        await this.sendEmail({
            to: email,
            subject: '🎉 Xác thực tài khoản - Web Truyện HungYeu',
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
        const text = `Xin chào ${userName}!\n\nChào mừng bạn đã tham gia cộng đồng đọc truyện của chúng tôi!\n\nBạn có thể bắt đầu khám phá hàng ngàn câu chuyện hấp dẫn tại: ${frontendUrl}\n\nTrân trọng,\nĐội ngũ Web Truyện HungYeu`;

        await this.sendEmail({
            to: email,
            subject: '🎊 Chào mừng bạn đến với Web Truyện HungYeu!',
            html,
            text,
        });
    }

    /**
     * Send approval notification (approved)
     */
    async sendApprovalApprovedEmail(
        email: string,
        userName: string,
        storyTitle: string,
        storySlug: string,
        adminNote?: string
    ): Promise<void> {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
        const storyUrl = `${frontendUrl}/truyen/${storySlug}`;

        const html = this.getApprovalApprovedTemplate(userName, storyTitle, storyUrl, adminNote);
        const text = `Xin chào ${userName}!\n\nTruyện "${storyTitle}" của bạn đã được phê duyệt và xuất bản thành công!\n\nXem truyện tại: ${storyUrl}\n\n${adminNote ? `Ghi chú từ Admin: ${adminNote}\n\n` : ''}Trân trọng,\nĐội ngũ Web Truyện HungYeu`;

        await this.sendEmail({
            to: email,
            subject: `Truyện "${storyTitle}" đã được phê duyệt`,
            html,
            text,
        });
    }

    /**
     * Send approval notification (rejected)
     */
    async sendApprovalRejectedEmail(
        email: string,
        userName: string,
        storyTitle: string,
        reason?: string
    ): Promise<void> {
        const html = this.getApprovalRejectedTemplate(userName, storyTitle, reason);
        const text = `Xin chào ${userName}!\n\nRất tiếc, truyện "${storyTitle}" của bạn chưa được phê duyệt.\n\n${reason ? `Lý do: ${reason}\n\n` : ''}Bạn có thể chỉnh sửa và gửi lại yêu cầu phê duyệt.\n\nTrân trọng,\nĐội ngũ Web Truyện HungYeu`;

        await this.sendEmail({
            to: email,
            subject: `Truyện "${storyTitle}" chưa được phê duyệt`,
            html,
            text,
        });
    }

    /**
     * Send system notification email
     */
    async sendSystemNotification(
        email: string,
        userName: string,
        title: string,
        content: string,
        type: string,
        priority: string,
    ): Promise<void> {
        const html = this.getSystemNotificationTemplate(userName, title, content, type, priority);

        await this.sendEmail({
            to: email,
            subject: `[${this.getPriorityLabel(priority)}] ${title}`,
            html,
        });
    }

    private getPriorityLabel(priority: string): string {
        const labels: Record<string, string> = {
            LOW: 'Thông tin',
            NORMAL: 'Thông báo',
            HIGH: 'Quan trọng',
            URGENT: 'Khẩn cấp',
        };
        return labels[priority] || 'Thông báo';
    }

    private getTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            SYSTEM_UPDATE: 'Cập nhật hệ thống',
            MAINTENANCE: 'Bảo trì',
            NEW_FEATURE: 'Tính năng mới',
            ANNOUNCEMENT: 'Thông báo',
            WARNING: 'Cảnh báo',
            INFO: 'Thông tin',
        };
        return labels[type] || 'Thông báo';
    }

    private getSystemNotificationTemplate(
        userName: string,
        title: string,
        content: string,
        type: string,
        priority: string,
    ): string {
        const priorityColors: Record<string, { bg: string; text: string }> = {
            LOW: { bg: '#10b981', text: '#059669' },
            NORMAL: { bg: '#3b82f6', text: '#2563eb' },
            HIGH: { bg: '#f59e0b', text: '#d97706' },
            URGENT: { bg: '#ef4444', text: '#dc2626' },
        };

        const color = priorityColors[priority] || priorityColors.NORMAL;
        const typeLabel = this.getTypeLabel(type);

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; line-height: 1.6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, ${color.bg} 0%, ${color.text} 100%);">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                                ${title}
                            </h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                                ${typeLabel}
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px;">
                                Xin chào <strong>${userName}</strong>,
                            </p>
                            
                            <div style="margin: 24px 0; padding: 20px; background-color: #f9fafb; border-left: 4px solid ${color.bg}; border-radius: 4px;">
                                <p style="margin: 0; color: #1f2937; font-size: 15px; white-space: pre-wrap;">${content}</p>
                            </div>

                            <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
                                Trân trọng,<br>
                                <strong style="color: #1f2937;">Đội ngũ Web Truyện HungYeu</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">
                                Email này được gửi tự động, vui lòng không trả lời.
                            </p>
                            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                                © ${new Date().getFullYear()} Web Truyện HungYeu. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `.trim();
    }

    /**
     * Send email (uses nodemailer if configured, otherwise logs to console)
     */
    private async sendEmail(options: EmailOptions): Promise<void> {
        // 🔥 FIX: For Gmail SMTP, FROM must match EMAIL_USER
        const isGmail = this.emailHost?.includes('gmail.com') || false;
        let emailFrom: string;

        if (isGmail) {
            // Gmail requires FROM to match authenticated account (EMAIL_USER)
            emailFrom = this.emailUser || this.configService.get<string>('EMAIL_USER') || 'noreply@hungyeu.com';
            const configuredFrom = this.configService.get<string>('EMAIL_FROM');
            if (configuredFrom && configuredFrom !== emailFrom) {
                this.logger.warn(`⚠️ Gmail SMTP: Using EMAIL_USER (${emailFrom}) instead of EMAIL_FROM (${configuredFrom})`);
            }
        } else {
            // For other SMTP servers, use EMAIL_FROM if available
            emailFrom = this.configService.get<string>('EMAIL_FROM') ||
                this.emailUser ||
                this.configService.get<string>('EMAIL_USER') ||
                'noreply@hungyeu.com';
        }

        // If transporter is configured, send real email
        if (this.transporter) {
            try {
                const info = await this.transporter.sendMail({
                    from: `"Web Truyện HungYeu" <${emailFrom}>`,
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
From: ${emailFrom}
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
                                Web Truyện HungYeu
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
                                Cảm ơn bạn đã đăng ký tài khoản tại Web Truyện HungYeu. 
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
                                © 2026 Web Truyện HungYeu. All rights reserved.
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
                                Web Truyện HungYeu
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
                                    Bắt đầu với Web Truyện HungYeu
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
                                © 2026 Web Truyện HungYeu. All rights reserved.
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
     * Approval approved email template
     */
    private getApprovalApprovedTemplate(userName: string, storyTitle: string, storyUrl: string, adminNote?: string): string {
        return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Truyện đã được phê duyệt</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                                Truyện đã được phê duyệt
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Xin chào <strong style="color: #111827;">${userName}</strong>,
                            </p>
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Chúc mừng! Truyện <strong style="color: #111827;">"${storyTitle}"</strong> của bạn đã được phê duyệt và xuất bản thành công.
                            </p>
                            <p style="margin: 0 0 32px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                                Truyện của bạn giờ đã có thể được độc giả trên toàn hệ thống xem và theo dõi.
                            </p>
                            ${adminNote ? `
                            <div style="margin: 0 0 32px; padding: 20px; background-color: #f3f4f6; border-left: 3px solid #3b82f6; border-radius: 4px;">
                                <p style="margin: 0 0 8px; color: #111827; font-size: 14px; font-weight: 600;">
                                    Ghi chú từ quản trị viên:
                                </p>
                                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;">
                                    ${adminNote}
                                </p>
                            </div>
                            ` : ''}
                            <table role="presentation" style="margin: 0; width: 100%;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="${storyUrl}"
                                           style="display: inline-block; padding: 14px 40px; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500; border-radius: 6px; transition: background-color 0.2s;">
                                            Xem truyện của bạn
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; color: #9ca3af; font-size: 13px; text-align: center;">
                                Web Truyện HungYeu &copy; 2026
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
     * Approval rejected email template
     */
    private getApprovalRejectedTemplate(userName: string, storyTitle: string, reason?: string): string {
        return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Truyện chưa được phê duyệt</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                                Yêu cầu phê duyệt bị từ chối
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Xin chào <strong style="color: #111827;">${userName}</strong>,
                            </p>
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Rất tiếc, truyện <strong style="color: #111827;">"${storyTitle}"</strong> của bạn chưa được phê duyệt.
                            </p>
                            ${reason ? `
                            <div style="margin: 0 0 32px; padding: 20px; background-color: #fef2f2; border-left: 3px solid #ef4444; border-radius: 4px;">
                                <p style="margin: 0 0 8px; color: #111827; font-size: 14px; font-weight: 600;">
                                    Lý do từ chối:
                                </p>
                                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5;">
                                    ${reason}
                                </p>
                            </div>
                            ` : ''}
                            <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                                Bạn có thể chỉnh sửa nội dung truyện và gửi lại yêu cầu phê duyệt. Vui lòng đảm bảo nội dung tuân thủ các quy định của chúng tôi.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; color: #9ca3af; font-size: 13px; text-align: center;">
                                Web Truyện HungYeu &copy; 2026
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
