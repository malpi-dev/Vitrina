import { mapSupabaseError } from '@/core/errors';

/** The `data` of the successful (`error: null`) member of a supabase-js response union. */
type Success<R> = R extends { error: null; data: infer D } ? D : never;

/**
 * Executes a supabase-js call and converts BOTH returned errors and thrown errors into DomainError.
 * `notFoundEntity` tells the mapper what a "not found" error refers to.
 */
export async function run<R extends { error: unknown }>(
  op: () => PromiseLike<R>,
  notFoundEntity: 'product' | 'order' | 'profile' = 'product',
): Promise<Success<R>> {
  let result: R;
  try {
    result = await op();
  } catch (e) {
    throw mapSupabaseError(e, notFoundEntity);
  }
  if (result.error) throw mapSupabaseError(result.error, notFoundEntity);
  return (result as { data?: unknown }).data as Success<R>;
}
