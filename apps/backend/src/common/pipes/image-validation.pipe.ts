/**
 * @deprecated Dùng `ImageNormalizePipe` từ `./image-normalize.pipe` thay thế.
 * Re-export ở đây để tránh vỡ import cũ. Tên `ImageValidationPipe` không còn
 * mô tả đúng hành vi (pipe hiện tại không chỉ validate mà còn re-encode buffer).
 */
export {
  ImageNormalizePipe as ImageValidationPipe,
  ImageNormalizeOptions as ImageValidationOptions,
} from './image-normalize.pipe';
