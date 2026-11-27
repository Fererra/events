import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../application/password-policy.js';
import { PERSON_NAME_MAX_LENGTH } from '../domain/person-name.js';

/** JSON Schemas for request validation and response serialization. */

export const registerBody = {
  type: 'object',
  required: ['surname', 'name', 'phone', 'email', 'password'],
  additionalProperties: false,
  properties: {
    surname: { type: 'string', minLength: 1, maxLength: PERSON_NAME_MAX_LENGTH },
    name: { type: 'string', minLength: 1, maxLength: PERSON_NAME_MAX_LENGTH },
    phone: { type: 'string', minLength: 10, maxLength: 30 },
    email: { type: 'string', format: 'email', maxLength: 254 },
    password: { type: 'string', minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH },
  },
} as const;

export const userResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    surname: { type: ['string', 'null'] },
    name: { type: ['string', 'null'] },
    phone: { type: ['string', 'null'] },
    role: { type: 'string', enum: ['user', 'admin'] },
    createdAt: { type: 'string' },
  },
} as const;

/** Login does not enforce the password policy (that would leak it on old accounts). */
export const loginBody = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', minLength: 1, maxLength: 254 },
    password: { type: 'string', minLength: 1, maxLength: PASSWORD_MAX_LENGTH },
  },
} as const;

export const tokenPairResponse = {
  type: 'object',
  properties: {
    tokenType: { type: 'string' },
    accessToken: { type: 'string' },
    expiresIn: { type: 'integer' },
    refreshToken: { type: 'string' },
    refreshExpiresIn: { type: 'integer' },
  },
} as const;

export const refreshTokenBody = {
  type: 'object',
  required: ['refreshToken'],
  additionalProperties: false,
  properties: {
    refreshToken: { type: 'string', minLength: 1, maxLength: 2048 },
  },
} as const;

export interface RefreshTokenBody {
  refreshToken: string;
}

export interface RegisterBody {
  surname: string;
  name: string;
  phone: string;
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}
