import { User } from '@prisma/client';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    role: string;
  };
  message?: string;
}

export class TokenResponseDto {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    role: string;
  };
}

