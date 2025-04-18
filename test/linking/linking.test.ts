import { afterEach, beforeAll, describe, expect, it, test } from "vitest";
import { EmptyFileSystem, type LangiumDocument } from "langium";
import { expandToString as s } from "langium/generate";
import { clearDocuments, parseHelper } from "langium/test";
import { createMiniProbServices } from "../../src/language/mini-prob-module.js";
import { Assignment, BinaryExpression, FuncCall, IfThenElse, Lval, Program, While, isProgram } from "../../src/language/generated/ast.js";

let services: ReturnType<typeof createMiniProbServices>;
let parse: ReturnType<typeof parseHelper<Program>>;
let document: LangiumDocument<Program> | undefined;

beforeAll(async () => {
  services = createMiniProbServices(EmptyFileSystem);
  parse = parseHelper<Program>(services.MiniProb);

  // activate the following if your linking test requires elements from a built-in library, for example
  // await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
});

afterEach(async () => {
  document && clearDocuments(services.shared, [document]);
});

describe('Linking test', () => {
  it('should pass a dummy test', () => {
    // A placeholder test that always passes.
    expect(true).toBe(true);
  });

  it('should correctly link local functions statements to global declarations', async () => {
    document = await parse(`
        bool flag;
        u8 _common;
        
        main() {
          flag = false;
          _common = _common + 1u2;
        }
      `);

    expect(checkDocumentValid(document)).toBeFalsy();
    // flag assignment
    const globalDeclarations = document.parseResult.value.declarations;
    const localRefContainer = document.parseResult.value.functions[0].body.statements;
    expect((localRefContainer[0] as Assignment).leftValue.ref.error).toBeFalsy();
    expect((localRefContainer[0] as Assignment).leftValue.ref.ref).toBeTruthy();
    expect((localRefContainer[0] as Assignment).leftValue.ref.ref!.names[0]).toBe(globalDeclarations[0].names[0]);
    // _common assignment
    expect((localRefContainer[1] as Assignment).leftValue.ref.error).toBeFalsy();
    expect((localRefContainer[1] as Assignment).leftValue.ref.ref).toBeTruthy();
    expect((localRefContainer[1] as Assignment).leftValue.ref.ref!.names[0]).toBe(globalDeclarations[1].names[0]);
    expect((((localRefContainer[1] as Assignment).expression as BinaryExpression).left as Lval).ref.error).toBeFalsy();
    expect((((localRefContainer[1] as Assignment).expression as BinaryExpression).left as Lval).ref.ref).toBeTruthy();
    expect((((localRefContainer[1] as Assignment).expression as BinaryExpression).left as Lval).ref.ref!.names[0]).toBe(globalDeclarations[1].names[0]);
  });

  it('should correctly link local functions statements to local declarations', async () => {
    document = await parse(`
        main() {
          bool flag;
          u8 _common;
          flag = false;
          _common = _common + 1u2;
        }
      `);

    expect(checkDocumentValid(document)).toBeFalsy();
    // flag assignment
    const declarations = document.parseResult.value.functions[0].declarations;
    const localRefContainer = document.parseResult.value.functions[0].body.statements;
    expect((localRefContainer[0] as Assignment).leftValue.ref.error).toBeFalsy();
    expect((localRefContainer[0] as Assignment).leftValue.ref.ref).toBeTruthy();
    expect((localRefContainer[0] as Assignment).leftValue.ref.ref!.names[0]).toBe(declarations[0].names[0]);
    // _common assignment
    expect((localRefContainer[1] as Assignment).leftValue.ref.error).toBeFalsy();
    expect((localRefContainer[1] as Assignment).leftValue.ref.ref).toBeTruthy();
    expect((localRefContainer[1] as Assignment).leftValue.ref.ref!.names[0]).toBe(declarations[1].names[0]);
    expect((((localRefContainer[1] as Assignment).expression as BinaryExpression).left as Lval).ref.error).toBeFalsy();
    expect((((localRefContainer[1] as Assignment).expression as BinaryExpression).left as Lval).ref.ref).toBeTruthy();
    expect((((localRefContainer[1] as Assignment).expression as BinaryExpression).left as Lval).ref.ref!.names[0]).toBe(declarations[1].names[0]);
  });

  it('should correctly link functions calls to existing functions', async () => {
    document = await parse(`
        main() {
          helper();
        }
        helper() {
          throw;
        }
      `);

    expect(checkDocumentValid(document)).toBeFalsy();
    expect((document.parseResult.value.functions[0].body.statements[0] as FuncCall).ref.error).toBeFalsy();
    expect((document.parseResult.value.functions[0].body.statements[0] as FuncCall).ref.ref).toBeTruthy();
    expect((document.parseResult.value.functions[0].body.statements[0] as FuncCall).ref.ref!.name).toBe(document.parseResult.value.functions[1].name);
  });

  it('should correctly link functions calls and passed arguments to existing functions and declarations', async () => {
    document = await parse(`
        main() {
          bool mainFlag;
          helper(mainFlag);
        }
        helper(bool flag) {
          throw;
        }
      `);

    expect(checkDocumentValid(document)).toBeFalsy();
    expect((document.parseResult.value.functions[0].body.statements[0] as FuncCall).argumentList).toBeTruthy();
    expect(((document.parseResult.value.functions[0].body.statements[0] as FuncCall).argumentList!.arguments[0].expression as Lval).ref.error).toBeFalsy();
    expect(((document.parseResult.value.functions[0].body.statements[0] as FuncCall).argumentList!.arguments[0].expression as Lval).ref.ref).toBeTruthy();
    expect(
      ((document.parseResult.value.functions[0].body.statements[0] as FuncCall).argumentList!.arguments[0].expression as Lval).ref.ref!.names[0]
    ).toBe(document.parseResult.value.functions[0].declarations[0].names[0]);
    expect((document.parseResult.value.functions[0].body.statements[0] as FuncCall).ref.error).toBeFalsy();
    expect((document.parseResult.value.functions[0].body.statements[0] as FuncCall).ref.ref).toBeTruthy();
    expect((document.parseResult.value.functions[0].body.statements[0] as FuncCall).ref.ref!.name).toBe(document.parseResult.value.functions[1].name);
  });

  it('should recognize the invalid reference in statements to non-existing decalarations', async () => {
    document = await parse(`
      main() {
        if(flag) {
          y = 0s1;
        } else {
          y = 1s1;
        }
      }
    `);

    expect(checkDocumentValid(document)).toBeFalsy();
    expect(((document.parseResult.value.functions[0].body.statements[0] as IfThenElse).condition as Lval).ref.error).toBeTruthy();
    expect(
      ((document.parseResult.value.functions[0].body.statements[0] as IfThenElse).condition as Lval).ref.error?.message
    ).toEqual(expect.stringContaining('Could not resolve reference to Decl named \'flag\''));
    expect(((document.parseResult.value.functions[0].body.statements[0] as IfThenElse).thenBlock.statements[0] as Assignment).leftValue.ref.error).toBeTruthy();
    expect(
      ((document.parseResult.value.functions[0].body.statements[0] as IfThenElse).thenBlock.statements[0] as Assignment).leftValue.ref.error!.message
    ).toEqual(expect.stringContaining('Could not resolve reference to Decl named \'y\''));
  });

  it('should recognize the invalid reference to another local declaration', async () => {
    document = await parse(`
      main() {
        while (flag) {
          throw;
        }
      }
      helper() {
        bool flag;
        while (flag) {
          throw;
        }
      }
    `);

    expect(checkDocumentValid(document)).toBeFalsy();
    expect(((document.parseResult.value.functions[0].body.statements[0] as While).condition as Lval).ref.error).toBeTruthy();
    expect(
      ((document.parseResult.value.functions[0].body.statements[0] as While).condition as Lval).ref.error!.message
    ).toEqual(expect.stringContaining('Could not resolve reference to Decl named \'flag\''));
    // check if helper statemetns correctly resolves reference(link)
    expect(((document.parseResult.value.functions[1].body.statements[0] as While).condition as Lval).ref.error).toBeFalsy();
  });

  it('should recognize the invalid function call and parameter', async () => {
    document = await parse(`
      main() {
        helper(mainFlag);
      }
    `);
    expect(checkDocumentValid(document)).toBeFalsy();
    expect((document.parseResult.value.functions[0].body.statements[0] as FuncCall).argumentList).toBeTruthy();
    expect(((document.parseResult.value.functions[0].body.statements[0] as FuncCall).argumentList!.arguments[0].expression as Lval).ref.error).toBeTruthy();
    expect(
      ((document.parseResult.value.functions[0].body.statements[0] as FuncCall).argumentList!.arguments[0].expression as Lval).ref.error!.message
    ).toEqual(expect.stringContaining('Could not resolve reference to Decl named \'mainFlag\''));
    expect((document.parseResult.value.functions[0].body.statements[0] as FuncCall).ref.error).toBeTruthy();
    expect(
      (document.parseResult.value.functions[0].body.statements[0] as FuncCall).ref.error!.message
    ).toEqual(expect.stringContaining('Could not resolve reference to Func named \'helper\''));
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