import { UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Email/username hoặc mật khẩu không đúng');
  }
}

export class UserInactiveException extends UnauthorizedException {
  constructor() {
    super('Tài khoản đã bị khóa');
  }
}

export class EmailExistsException extends ConflictException {
  constructor() {
    super('Email đã được sử dụng');
  }
}

export class UsernameExistsException extends ConflictException {
  constructor() {
    super('Username đã được sử dụng');
  }
}

export class InvalidRefreshTokenException extends UnauthorizedException {
  constructor() {
    super('Refresh token không hợp lệ');
  }
}

export class InsufficientPermissionsException extends ForbiddenException {
  constructor() {
    super('Bạn không có quyền thực hiện hành động này');
  }
}

