import { createMiniProbServices } from '../../src/language/mini-prob-module.js';
import { parseHelper } from 'langium/test';
import { TestFileSystemProvider } from './TestFileSystemProvider.js';
import type { Program } from '../../src/language/generated/ast.js';

// 1) Define your fake file map:
export const initialFiles = {
    'file:///lib.pomc': `u8 bar;\nfoo(){u8 bar2; bar=8u8;}`,
    'file:///main.pomc': `
    #include "/lib.pomc"
    main() {
        bar = 8u8;            
        foo();
        bar2= 8u8;
    }
  `.trim()
};

// 2) Create services, *only* overriding the fileSystemProvider
export const services = createMiniProbServices({
    fileSystemProvider: () => new TestFileSystemProvider(initialFiles)
});

// 3) Pre-load (parse, index, scope, link) all of the URIs your provider knows about
export async function initializeTestWorkspace() {
    await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
}

// 4) Export the usual parse helper for single-file tests
export const parse = parseHelper<Program>(services.MiniProb);

