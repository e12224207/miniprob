// src/language/mini-prob-scope-computation.ts
import { DefaultScopeComputation, AstNodeDescription, LangiumDocument } from 'langium';
import type { AstNode } from 'langium';
import { Program } from '../generated/ast.js';
//import type { Program, Decl } from './generated/ast.ts';

export class MiniProbScopeComputation extends DefaultScopeComputation {
  override async computeExports(document: LangiumDocument<AstNode>): Promise<AstNodeDescription[]> {
    //compute default exports (functions)
    const exports = await super.computeExports(document);

    const program = document.parseResult.value as Program;

    //export top level declarations
    for (const decl of program.declarations ?? []) {
      for (const name of decl.names) {
        exports.push(this.descriptions.createDescription(decl, name, document));
      }
    }

    return exports;
  }
}
