import type { MiddlewareHandler } from 'hono';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { AppEnv } from '../app.js';

// Lazily-initialized verifier (avoids constructing on every request).
let _verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier(): ReturnType<typeof CognitoJwtVerifier.create> {
  if (_verifier) return _verifier;

  const userPoolId = process.env['COGNITO_USER_POOL_ID'];
  const clientId = process.env['COGNITO_CLIENT_ID'];
  if (!userPoolId || !clientId) {
    throw new Error('COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set in production');
  }

  _verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: 'id',
    clientId,
  });
  return _verifier;
}

/**
 * Auth middleware for all `/api/v1/*` routes (except health).
 *
 * - Development (`NODE_ENV=development`): reads `DEV_USER_ID` from env and
 *   sets it as `userId` without verifying any token.
 * - Production: verifies the Cognito ID token in the `Authorization: Bearer`
 *   header and extracts the `sub` claim as `userId`.
 */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (process.env['NODE_ENV'] === 'development') {
    const userId = process.env['DEV_USER_ID'];
    if (!userId) {
      return c.json({ error: 'INTERNAL_ERROR', message: 'DEV_USER_ID not set in .env.local' }, 500);
    }
    c.set('userId', userId);
    await next();
    return;
  }

  // Production: verify Cognito JWT.
  const authorization = c.req.header('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, 401);
  }

  const token = authorization.slice(7);
  try {
    const payload = await getVerifier().verify(token);
    c.set('userId', payload.sub);
    await next();
  } catch {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' }, 401);
  }
};
