import { SimpleCache } from 'langium';
import type { AstNodeDescription, Scope } from 'langium';

// We don’t need to add members here yet — SimpleCache already handles
// Map<string, AstNodeDescription[]> plus automatic clearing on doc changes.
export class SharedMiniProbCache extends SimpleCache<string, Scope> {}
