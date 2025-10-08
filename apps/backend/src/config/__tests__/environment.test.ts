import { getEnvironment } from '../environment';
import fs from 'fs';
import path from 'path';

describe('environment config', () => {
  const privPath = path.join(__dirname, '../../../../../../keys/jwt_private.pem');
  const pubPath = path.join(__dirname, '../../../../../../keys/jwt_public.pem');

  const origEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...origEnv };
    // reset module cache between tests
    jest.resetModules();
  });

  it('loads JWT keys from PATH variables', () => {
    if (!fs.existsSync(privPath) || !fs.existsSync(pubPath)) {
      console.warn('Skipping test: rsa keys not present');
      return;
    }
    process.env.JWT_PRIVATE_KEY_PATH = privPath;
    process.env.JWT_PUBLIC_KEY_PATH = pubPath;
    const env = getEnvironment();
    expect(env.jwtPrivateKey).toBeDefined();
    expect(env.jwtPublicKey).toBeDefined();
  });

  it('allows LEGACY secret temporarily if no RSA keys', () => {
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.JWT_PRIVATE_KEY_PATH;
    delete process.env.JWT_PUBLIC_KEY;
    delete process.env.JWT_PUBLIC_KEY_PATH;
    process.env.JWT_LEGACY_SECRET = 'legacy-secret';
    const env = getEnvironment();
    expect(env.JWT_LEGACY_SECRET).toBe('legacy-secret');
  });
});


