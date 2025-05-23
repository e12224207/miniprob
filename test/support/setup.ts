import { createMiniProbServices } from '../../src/language/mini-prob-module.js';
import { parseHelper } from 'langium/test';
import { TestFileSystemProvider } from './TestFileSystemProvider.js';
import type { Program } from '../../src/language/generated/ast.js';

// 1) Define your fake file map:
export const files = {
    'file:///lib.pomc': `u8 foo;\nbar(){foo=8u8;}`,
    'file:///main.pomc': `
    #include "/lib.pomc"
    main() {
        foo = 8u8;            
        bar();
    }
  `.trim()
};

// 2) Create services, *only* overriding the fileSystemProvider
export const services = createMiniProbServices({
    fileSystemProvider: () => new TestFileSystemProvider(files)
});

// 3) Pre-load (parse, index, scope, link) all of the URIs your provider knows about
export async function initializeTestWorkspace() {
    await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
}

// 4) Export the usual parse helper for single-file tests
export const parse = parseHelper<Program>(services.MiniProb);

