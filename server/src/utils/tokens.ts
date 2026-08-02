 import jwt from 'jsonwebtoken';

 interface TokenPayload {
    userId: string;
 }

 export const generateAccessToken = (userId: string): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');

    return jwt.sign({ userId }, secret, {
        expiresIn: '15m',
    });
 };

 export const generateRefreshToken = (userId: string): string => {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('JWT_REFRESH_SECRET is not defnied');

    return jwt.sign({ userId }, secret, {
        expiresIn: '7d',
    });
 };

export const verifyAccessToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');

  return jwt.verify(token, secret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');

  return jwt.verify(token, secret) as TokenPayload;
};