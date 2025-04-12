import { afterEach, beforeAll, describe, expect, it, test } from "vitest";
import { EmptyFileSystem, type LangiumDocument } from "langium";
import { expandToString as s } from "langium/generate";
import { clearDocuments, parseHelper } from "langium/test";
import { createMiniProbServices } from "../../src/language/mini-prob-module.js";
import { Program, isProgram } from "../../src/language/generated/ast.js";

let services: ReturnType<typeof createMiniProbServices>;
let parse:    ReturnType<typeof parseHelper<Program>>;
let document: LangiumDocument<Program> | undefined;

beforeAll(async () => {
    services = createMiniProbServices(EmptyFileSystem);
    parse = parseHelper<Program>(services.MiniProb);

    // activate the following if your linking test requires elements from a built-in library, for example
    // await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
});

afterEach(async () => {
    document && clearDocuments(services.shared, [ document ]);
});

describe('Parsing Module', () => {
    it('should pass a dummy test', () => {
      // A placeholder test that always passes.
      expect(true).toBe(true);
    });
  });

// describe('Linking tests', () => {
// 
//     test('linking of greetings', async () => {
//         document = await parse(`
//             person Langium
//             Hello Langium!
//         `);
// 
//         expect(
//             // here we first check for validity of the parsed document object by means of the reusable function
//             //  'checkDocumentValid()' to sort out (critical) typos first,
//             // and then evaluate the cross references we're interested in by checking
//             //  the referenced AST element as well as for a potential error message;
//             checkDocumentValid(document)
//                 || document.parseResult.value.greetings.map(g => g.person.ref?.name || g.person.error?.message).join('\n')
//         ).toBe(s`
//             Langium
//         `);
//     });
// });
// 
// function checkDocumentValid(document: LangiumDocument): string | undefined {
//     return document.parseResult.parserErrors.length && s`
//         Parser errors:
//           ${document.parseResult.parserErrors.map(e => e.message).join('\n  ')}
//     `
//         || document.parseResult.value === undefined && `ParseResult is 'undefined'.`
//         || !isModel(document.parseResult.value) && `Root AST object is a ${document.parseResult.value.$type}, expected a '${Model}'.`
//         || undefined;
// }