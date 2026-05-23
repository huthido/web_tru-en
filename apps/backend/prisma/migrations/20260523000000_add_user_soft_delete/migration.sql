-- Soft-delete timestamp on users. NULL = tài khoản hoạt động bình thường.
-- Khi self-delete (Apple §5.1.1(v)): PII bị anonymise + isActive=false +
-- deletedAt=now() trong cùng một transaction.
ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP(3);
