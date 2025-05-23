import { beforeAll, describe, it, expect } from 'vitest';
import { services, initializeTestWorkspace, parse, files } from '../support/setup.js';
import { Lval, Decl, FuncCall, Func } from '../../src/language/generated/ast.js';
import { LangiumDocument, URI } from 'langium';

let mainDoc: Awaited<ReturnType<typeof parse>>;

async function buildUri(uri: URI): Promise<void> {
    
    const doc = await services.shared.workspace.LangiumDocuments.getOrCreateDocument(uri);
    await services.shared.workspace.DocumentBuilder.build([doc])
}

beforeAll(async () => {
  await initializeTestWorkspace();

  await buildUri(URI.parse(`file:///lib.pomc`));

  // parse “main.prob” by overriding the URI so it re-uses our in-memory doc
  mainDoc = await parse(files['file:///main.pomc'], { documentUri: 'file:///main.pomc' }
  );
});

describe('“#include” linking', () => {
  it('resolves foo back to lib.pomc', () => {
    // assume your grammar wraps top-level statements in a dummy function or block:
    const stmt = mainDoc.parseResult.value.functions[0].body.statements;
    const lv = (stmt[0] as { leftValue: Lval }).leftValue;
    const fc = (stmt[1] as FuncCall);
    expect(lv.ref.error).toBeFalsy();
    expect(fc.ref.error).toBeFalsy();
    const target = lv.ref.ref as Decl;
    const fcTarget = fc.ref.ref as Func;
    expect(fcTarget.name).toBe('bar');
  });
});
