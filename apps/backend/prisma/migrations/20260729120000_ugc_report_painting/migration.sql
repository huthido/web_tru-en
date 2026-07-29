-- Cho phép báo cáo tranh vi phạm (gian hàng Tranh trước đây không nằm trong
-- UgcReportTargetType nên không có cách nào report).
-- AlterEnum
ALTER TYPE "UgcReportTargetType" ADD VALUE 'PAINTING';
