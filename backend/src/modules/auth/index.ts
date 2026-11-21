/**
 * Auth module — public API.
 * Authentication, accounts, roles (JWT + Argon2).
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppConfig } from '../../shared/config/env.js';
import type { AppModule } from '../../shared/module.js';
import { createAuthContainer } from './auth.container.js';
import { JwtTokenService } from './infrastructure/jwt-token-service.js';
import { registerAuthRoutes } from './presentation/auth.routes.js';
import { createAuthGuards, type AuthGuards } from './presentation/guards.js';

export type { Role } from './domain/role.js';
export type { AuthGuards, AuthUser } from './presentation/guards.js';
export { currentUser } from './presentation/guards.js';

/**
 * Guards for other modules' routes:
 *   const { requireAuth, requireAdmin } = authGuards(ctx.config);
 *   app.post('/venues', { preHandler: requireAdmin }, handler);
 * Stateless — they only verify the access JWT, no DB lookup.
 */
export function authGuards(config: AppConfig): AuthGuards {
  return createAuthGuards(new JwtTokenService(config.auth));
}

export const authModule: AppModule = {
  name: 'auth',
  register(app, ctx) {
    const auth = createAuthContainer(ctx);
    registerAuthRoutes(app, auth);

    const { adminEmail, adminPassword } = ctx.config.auth;
    if (adminEmail && adminPassword) {
      app.addHook('onReady', async () => {
        const result = await auth.ensureAdmin.execute({
          email: adminEmail,
          password: adminPassword,
        });
        app.log.info({ adminEmail, result }, 'bootstrap administrator');
      });
    }
  },
};
