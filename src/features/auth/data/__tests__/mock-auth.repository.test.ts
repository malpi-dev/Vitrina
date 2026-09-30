import { DEMO_USER } from '@/features/demo/data/fixtures';
import { MockStore } from '@/features/demo/data/mock-store';

import { MockAuthRepository } from '../mock-auth.repository';

const setup = () => new MockAuthRepository(new MockStore({ latencyMs: [0, 0] }));

describe('MockAuthRepository', () => {
  it('sendCode resolves', async () => {
    await expect(setup().sendCode()).resolves.toBeUndefined();
  });

  it('verifyCode accepts 123456 and rejects anything else with invalidCode', async () => {
    const repo = setup();
    await expect(repo.verifyCode('demo@vitrina.app', '123456')).resolves.toEqual(DEMO_USER);
    await expect(repo.verifyCode('demo@vitrina.app', '000000')).rejects.toMatchObject({
      info: { code: 'invalidCode' },
    });
  });

  it('the current user is the demo user and signOut is a no-op', async () => {
    const repo = setup();
    await expect(repo.getCurrentUser()).resolves.toEqual(DEMO_USER);
    await repo.signOut();
    await expect(repo.getCurrentUser()).resolves.toEqual(DEMO_USER);
  });

  it('onAuthChange emits the user immediately and returns an unsubscribe function', () => {
    const callback = jest.fn();
    const unsubscribe = setup().onAuthChange(callback);
    expect(callback).toHaveBeenCalledWith(DEMO_USER);
    expect(() => unsubscribe()).not.toThrow();
  });
});
