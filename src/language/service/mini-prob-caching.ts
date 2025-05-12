import { DocumentCache } from 'langium';
import type { AstNodeDescription, LangiumSharedCoreServices, Scope } from 'langium';
import { MiniProbServices } from '../mini-prob-module.js';

// We don’t need to add members here yet — SimpleCache already handles
// Map<string, AstNodeDescription[]> plus automatic clearing on doc changes.
export class SharedMiniProbCache extends DocumentCache<string, Scope> {
    /**
     *
     */
    constructor(services: MiniProbServices) {
        super(services.shared);
    }
}
