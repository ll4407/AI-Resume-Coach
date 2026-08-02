import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
        throw new AppError('An account with this email already exists', 409);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the user
    const user = await User.create({
        email, 
        password: hashedPassword,
        name,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    res.status(201).json({
        success: true,
        data: {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
            accessToken,
            refreshToken,
        },
    });
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    // Find user and explicitly include the password field
    const user = await User.findOne({email}).select('+password');

    if (!user) {
        throw new AppError('Invalid email or password', 401);
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password)

    if (!isPasswordCorrect) {
        throw new AppError('Invalid email or password', 401);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    
    res.status(201).json({
        success: true,
        data: {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
            accessToken,
            refreshToken,
        },
    });
};

// POST /api/auth/refresh
export const refresh = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  // Verify the refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Check user still exists
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new AppError('User no longer exists', 401);
  }

  // Token rotation — issue new pair of tokens
  const newAccessToken = generateAccessToken(user._id.toString());
  const newRefreshToken = generateRefreshToken(user._id.toString());

  res.status(200).json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
};

// GET /api/auth/me
export const getMe = async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById(req.user!.id);

    if (!user) {
        throw new AppError('User not found', 404);
    }

  res.status(200).json({
    success: true,
    data: {
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
        },
    },
  });
};