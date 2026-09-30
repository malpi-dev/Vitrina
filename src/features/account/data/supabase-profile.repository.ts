import type { Json } from '@/core/supabase/database.generated';
import { DomainError } from '@/core/errors';
import { run, type VitrinaSupabaseClient } from '@/core/supabase';

import type { Profile } from '../domain/profile';
import type { ProfileRepository } from '../domain/profile.repository';

import { toProfile } from './profile.mapper';

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: VitrinaSupabaseClient) {}

  /** Id of the signed-in user, read from the persisted session (no network round trip). */
  private async currentUserId(): Promise<string> {
    const { session } = await run(() => this.client.auth.getSession(), 'profile');
    if (!session) throw new DomainError({ code: 'unauthorized' }, 'Not signed in');
    return session.user.id;
  }

  /** The only way a profile is created (`vitrina.ensure_profile`, idempotent). */
  async ensureMine(): Promise<Profile> {
    return toProfile(await run(() => this.client.rpc('ensure_profile'), 'profile'));
  }

  async getMine(): Promise<Profile> {
    const uid = await this.currentUserId();
    const row = await run(
      () => this.client.from('profiles').select('*').eq('id', uid).maybeSingle(),
      'profile',
    );
    // Self-heals when the post-OTP `ensure_profile` call failed.
    return row ? toProfile(row) : this.ensureMine();
  }

  async update(patch: Parameters<ProfileRepository['update']>[0]): Promise<Profile> {
    const uid = await this.currentUserId();
    const values: { full_name?: string; default_address?: Json | null } = {};
    if (patch.fullName !== undefined) values.full_name = patch.fullName;
    if (patch.defaultAddress !== undefined) {
      values.default_address = patch.defaultAddress as Json | null;
    }
    const row = await run(
      () => this.client.from('profiles').update(values).eq('id', uid).select('*').single(),
      'profile',
    );
    return toProfile(row);
  }
}
