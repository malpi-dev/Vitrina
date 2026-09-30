import { DEMO_PROFILE } from '@/features/demo/data/fixtures';
import { MockStore } from '@/features/demo/data/mock-store';

import { MockProfileRepository } from '../mock-profile.repository';

const setup = () => {
  const store = new MockStore({ latencyMs: [0, 0] });
  return { store, repo: new MockProfileRepository(store) };
};

describe('MockProfileRepository', () => {
  it('ensureMine and getMine return the demo profile', async () => {
    const { repo } = setup();
    await expect(repo.ensureMine()).resolves.toEqual(DEMO_PROFILE);
    await expect(repo.getMine()).resolves.toEqual(DEMO_PROFILE);
  });

  it('update changes the name and the address, and persists within the session', async () => {
    const { repo } = setup();
    const address = { ...DEMO_PROFILE.defaultAddress!, city: 'Boston', state: 'MA' };
    const updated = await repo.update({ fullName: 'Ada', defaultAddress: address });
    expect(updated).toMatchObject({ fullName: 'Ada', defaultAddress: { city: 'Boston' } });
    await expect(repo.getMine()).resolves.toEqual(updated);
  });

  it('update with only one field leaves the other untouched; null clears the address', async () => {
    const { repo } = setup();
    await expect(repo.update({ fullName: 'Ada' })).resolves.toMatchObject({
      defaultAddress: DEMO_PROFILE.defaultAddress,
    });
    await expect(repo.update({ defaultAddress: null })).resolves.toMatchObject({
      fullName: 'Ada',
      defaultAddress: null,
    });
  });

  it('returns copies', async () => {
    const { repo } = setup();
    const profile = await repo.getMine();
    profile.fullName = 'Hacked';
    await expect(repo.getMine()).resolves.toMatchObject({ fullName: 'Demo Shopper' });
  });

  it('failNext makes the next call fail', async () => {
    const { repo, store } = setup();
    store.failNext({ code: 'unauthorized' });
    await expect(repo.getMine()).rejects.toMatchObject({ info: { code: 'unauthorized' } });
  });
});
