import { beforeAll, describe, expect, it, test } from "vitest";
import { EmptyFileSystem, type LangiumDocument } from "langium";
import { expandToString as s } from "langium/generate";
import { parseHelper } from "langium/test";
import type { Diagnostic } from "vscode-languageserver-types";
import { createMiniProbServices } from "../../src/language/mini-prob-module.js";
import { Program, isProgram } from "../../src/language/generated/ast.js";
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { performance } from 'perf_hooks';

import expectedErrorsJson from '../samples/validation/ExpectedErrorMessages.json'

let services: ReturnType<typeof createMiniProbServices>;
let parse: ReturnType<typeof parseHelper<Program>>;
let document: LangiumDocument<Program> | undefined;

// constants for each validation file
const FUNC_CALL_VALIDATION = 'funcCallValidation.pomc';
const OBSERVE_AND_QUERY_VALIDATION = 'observeAndQueryValidation.pomc';
const BINARY_EXPRESSION_VALIDATION = 'binaryExpressionValidation.pomc';
const DISTRIBUTION_VALIDATION = 'distributionValidation.pomc';
const LITERAL_AND_UNARY_VALIDATION = 'literalAndUnaryValidation.pomc';
const PROBABILISTIC_ASSIGNMENT_VALIDATION = 'probabilisticAssignmentValidation.pomc';


let sampleFiles = [
  'bounded-schelling.pomc',
  'empty.pomc',
  'everyLangRule.pomc',
  'mutualRec.pomc',
  'piranhaPuzzle.pomc',
  'Q1.pomc',
  'shelling.pomc',
  'tictactoe.pomc',
  'large_tictactoe_test_file.pomc',
  'large_tictactoe_test_1000.pomc'
];

beforeAll(async () => {
  services = createMiniProbServices(EmptyFileSystem);
  const doParse = parseHelper<Program>(services.MiniProb);
  parse = (input: string) => doParse(input, { validation: true });
});

describe('Parsing Module', () => {
  it('should pass a dummy test', () => {
    // A placeholder test that always passes.
    expect(true).toBe(true);
  });
});

describe('validate based on samples from https://github.com/michiari/POMC/tree/popa/eval', async () => {
  test('test samples', async () => {
    const results = []
    for (var i = 0; i < sampleFiles.length; i++) {
      const filePath = join(__dirname, `../samples/${sampleFiles[i]}`);
      console.log(filePath)
      // Read the file content as a string using UTF-8 encoding
      const fileContent = readFileSync(filePath, 'utf8');

      const t0 = performance.now();
      const document = await parse(fileContent);
      const t1 = performance.now();
      const timeTaken = (t1 - t0).toFixed(2);
      results.push(`${sampleFiles[i]},${timeTaken} ms`);

      if (checkDocumentValid(document)) {
        console.log('CheckDocumentValid is not undefined');
        // expect(
        //   document.diagnostics?.map(diagnosticToString).join('\n')
        // ).toEqual(
        //   expect.stringContaining(
        //     s`Expecting: expecting at least one iteration which starts with one of these possible Token sequences::`
        //   )
        // )
      }
    }
    writeFileSync(join(__dirname, 'timing_parse.txt'), results.join('\n'));
  })
});

describe('validating type system and semantics of test/samples/validation', async () => {

  it('groups and sorts diagnostics, then compares to sorted expected for each file', async () => {

    const expectedErrors = expectedErrorsJson as Record<string, Record<string, string[]>>;
    const fileNames = Object.keys(expectedErrors);

    for (const fileName of fileNames) {
      console.log(`\n=== Validating: ${fileName} ===`);

      // Parse the .pomc file with validation enabled
      const filePath = join(__dirname, `../samples/validation/${fileName}`);
      const fileContent = readFileSync(filePath, 'utf8');
      const document: LangiumDocument<Program> = await parse(fileContent, { validation: true });


      const actualGroupsMap = groupDiagnostics(document.diagnostics);
      const actualLineKeys = Object.keys(actualGroupsMap)
        .map(k => Number(k))
        .sort((a, b) => a - b)
        .map(n => String(n));
      const actualGroupsArr: string[][] = actualLineKeys.map(k => actualGroupsMap[k]);


      const rawExpected = expectedErrors[fileName];
      if (!rawExpected) {
        throw new Error(`No expected‐errors entry found for ${fileName}`);
      }

      const expectedLineKeys = Object.keys(rawExpected)
        .map(k => Number(k))
        .sort((a, b) => a - b)
        .map(n => String(n));
      const expectedGroupsArr: string[][] = expectedLineKeys.map(k => rawExpected[k]);


      expect(actualGroupsArr.length).toBe(expectedGroupsArr.length);

      for (let i = 0; i < expectedGroupsArr.length; i++) {
        const expGroup = expectedGroupsArr[i];
        const actGroup = actualGroupsArr[i];

        expect(actGroup).toHaveLength(expGroup.length);

        for (const expMsg of expGroup) {
          const found = actGroup.some(actMsg => actMsg.endsWith(expMsg));
          expect(found).toBe(true);
        }
      }
    }
  });
});

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

/**
 * Groups diagnostics by start line, then sorts each group’s messages.
 */
function groupDiagnostics(diagnostics: readonly Diagnostic[] = []): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const d of diagnostics) {
    const lineKey = String(d.range.start.line);
    const msg = diagnosticToString(d);
    if (!groups[lineKey]) {
      groups[lineKey] = [];
    }
    groups[lineKey].push(msg);
  }
  return groups;
}


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