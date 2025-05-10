import { beforeAll, describe, expect, it, test } from "vitest";
import { EmptyFileSystem, type LangiumDocument } from "langium";
import { expandToString as s } from "langium/generate";
import { parseHelper } from "langium/test";
import type { Diagnostic } from "vscode-languageserver-types";
import { createMiniProbServices } from "../../src/language/mini-prob-module.js";
import { Program, isProgram } from "../../src/language/generated/ast.js";
import { join } from "node:path";
import { readFileSync } from "node:fs";

let services: ReturnType<typeof createMiniProbServices>;
let parse: ReturnType<typeof parseHelper<Program>>;
let document: LangiumDocument<Program> | undefined;

let sampleFiles = [
  'bounded-schelling.pomc',
  'empty.pomc',
  'everyLangRule.pomc',
  'mutualRec.pomc',
  'piranhaPuzzle.pomc',
  'Q1.pomc',
  'shelling.pomc',
  'tictactoe.pomc'
];

beforeAll(async () => {
  services = createMiniProbServices(EmptyFileSystem);
  const doParse = parseHelper<Program>(services.MiniProb);
  parse = (input: string) => doParse(input, { validation: true });

  // activate the following if your linking test requires elements from a built-in library, for example
  // await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
});

describe('Parsing Module', () => {
  it('should pass a dummy test', () => {
    // A placeholder test that always passes.
    expect(true).toBe(true);
  });
});

describe('validate based on samples from https://github.com/michiari/POMC/tree/popa/eval', async () => {
  test('test samples', async () => {
    for(var i = 0; i < sampleFiles.length; i++) {
      const filePath = join(__dirname, `../samples/${sampleFiles[i]}`);
        // Read the file content as a string using UTF-8 encoding
        const fileContent = readFileSync(filePath, 'utf8');
        const document = await parse(fileContent);
        if (checkDocumentValid(document)) {
          expect(
            document.diagnostics?.map(diagnosticToString).join('\n')
          ).toEqual( //empty else block
            expect.stringContaining(
              s`Expecting: expecting at least one iteration which starts with one of these possible Token sequences::`
            )
          )
        }
    }
  })
});

// describe('Validating', () => {
//   
//     test('check no errors', async () => {
//         document = await parse(`
//             person Langium
//         `);
// 
//         expect(
//             // here we first check for validity of the parsed document object by means of the reusable function
//             //  'checkDocumentValid()' to sort out (critical) typos first,
//             // and then evaluate the diagnostics by converting them into human readable strings;
//             // note that 'toHaveLength()' works for arrays and strings alike ;-)
//             checkDocumentValid(document) || document?.diagnostics?.map(diagnosticToString)?.join('\n')
//         ).toHaveLength(0);
//     });
// 
//     test('check capital letter validation', async () => {
//         document = await parse(`
//             person langium
//         `);
// 
//         expect(
//             checkDocumentValid(document) || document?.diagnostics?.map(diagnosticToString)?.join('\n')
//         ).toEqual(
//             // 'expect.stringContaining()' makes our test robust against future additions of further validation rules
//             expect.stringContaining(s`
//                 [1:19..1:26]: Person name should start with a capital.
//             `)
//         );
//     });
// });
// 
function checkDocumentValid(document: LangiumDocument): string | undefined {
    return document.parseResult.parserErrors.length && s`
        Parser errors:
          ${document.parseResult.parserErrors.map(e => e.message).join('\n  ')}
    `
        || document.parseResult.value === undefined && `ParseResult is 'undefined'.`
        || !isProgram(document.parseResult.value) && `Root AST object is a ${document.parseResult.value.$type}, expected a '${Program}'.`
        || undefined;
}

function diagnosticToString(d: Diagnostic) {
  return `[${d.range.start.line}:${d.range.start.character}..${d.range.end.line}:${d.range.end.character}]: ${d.message}`;
}