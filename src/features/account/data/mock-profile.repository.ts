import type { MockStore } from '@/features/demo/data/mock-store';
import { clone } from '@/features/demo/data/clone';

import type { Profile } from '../domain/profile';
import type { ProfileRepository } from '../domain/profile.repository';

export class MockProfileRepository implements ProfileRepository {
  constructor(private readonly store: MockStore) {}

  ensureMine(): Promise<Profile> {
    return this.getMine();
  }

  async getMine(): Promise<Profile> {
    await this.store.delay();
    this.store.takeFailure();
    return clone(this.store.profile);
  }

  async update(patch: Parameters<ProfileRepository['update']>[0]): Promise<Profile> {
    await this.store.delay();
    this.store.takeFailure();
    if (patch.fullName !== undefined) this.store.profile.fullName = patch.fullName;
    if (patch.defaultAddress !== undefined) {
      this.store.profile.defaultAddress = clone(patch.defaultAddress);
    }
    return clone(this.store.profile);
  }
}
