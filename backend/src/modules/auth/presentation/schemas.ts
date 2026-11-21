import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../application/password-policy.js';

/** JSON Schemas for request validation and response serialization. */

export const credentialsBody = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', format: 'email', maxLength: 254 },
    password: { type: 'string', minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH },
  },
} as const;

export const userResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    role: { type: 'string', enum: ['user', 'admin'] },
    createdAt: { type: 'string' },
  },
} as const;

export interface CredentialsBody {
  email: string;
  password: string;
}
