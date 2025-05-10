import { beforeAll, describe, expect, it, test } from "vitest";
import { EmptyFileSystem, type LangiumDocument } from "langium";
import { expandToString as s } from "langium/generate";
import { parseHelper } from "langium/test";
import { createMiniProbServices } from "../../src/language/mini-prob-module.js";
import { Assignment, BinaryExpression, BoolLiteral, FuncCall, IfThenElse, IntArray, IntLiteral, LogicalNegation, Lval, Observation, ProbabilisticAssignment, Program, Query, TryCatch, While, isProgram } from "../../src/language/generated/ast.js";
import { join } from "path";
import { readFileSync } from "fs";

let services: ReturnType<typeof createMiniProbServices>;
let parse: ReturnType<typeof parseHelper<Program>>;
let document: LangiumDocument<Program> | undefined;

beforeAll(async () => {
    services = createMiniProbServices(EmptyFileSystem);
    parse = parseHelper<Program>(services.MiniProb);

    // activate the following if your linking test requires elements from a built-in library, for example
    // await services.shared.workspace.WorkspaceManager.initializeWorkspace([]);
});

describe('Parsing Module', () => {
    it('should pass a dummy test', () => {
        // A placeholder test that always passes.
        expect(true).toBe(true);
    });
});

describe('Parsing complex expression', async () => {
    it('should parse the expressions correctly', async () => {
        const document = await parse(s`
            main() {
                s32 y;
                y = (true) || (2s4 + 1s4) % 2s4 == 1s4;
                y = 3s4 * 4s4 - (1s4 / 1s4);
                y = y >= 2s4 && !false;
                y = 5s6 + 4u8 + 5s6 + 6s6;
                y = (1s2 {4s4 : 2s4} 2s2) { 4s4 : 6s4 } -3s4 { 4s4 : 6s4 } 2u4;
            }
        `);
        // Optionally, you can perform a validation check
        expect(checkDocumentValid(document)).toBeFalsy();
        // Assign the program from the parsed document
        var program = document.parseResult.value;
        expect(isProgram(program)).toBeTruthy();

        var assignemnts = program.functions[0].body.statements;
        expect(assignemnts.length).toBe(5);

        // y = (true) || (2s4 + 1s4) % 2s4 == 1s4
        expect(
            (((assignemnts[0] as Assignment).expression as BinaryExpression).left as BoolLiteral).literal
        ).toBeTruthy();
        expect(
            (((assignemnts[0] as Assignment).expression as BinaryExpression).operator)
        ).toBe('||');
        var deeper = ((assignemnts[0] as Assignment).expression as BinaryExpression).right as BinaryExpression;
        expect(deeper.operator).toBe('==');
        expect(deeper.right.$type).toBe('IntLiteral');
        deeper = deeper.left as BinaryExpression;
        expect(deeper.operator).toBe('%');
        expect(deeper.left.$type).toBe('BinaryExpression');
        expect((deeper.left as BinaryExpression).operator).toBe('+');
        expect(((deeper.left as BinaryExpression).right as IntLiteral).literal.value).toBe(1);
        expect(((deeper.left as BinaryExpression).left as IntLiteral).literal.value).toBe(2);


        // y = 3s4 * 4s4 - (1s4 / 1s4)
        expect(
            (((assignemnts[1] as Assignment).expression as BinaryExpression).operator)
        ).toBe('-');
        var deeper = ((assignemnts[1] as Assignment).expression as BinaryExpression).right as BinaryExpression;
        expect(deeper.operator).toBe('/');
        expect(deeper.right.$type).toBe('IntLiteral');
        deeper = ((assignemnts[1] as Assignment).expression as BinaryExpression).left as BinaryExpression;
        expect(deeper.operator).toBe('*');
        expect(deeper.$type).toBe('BinaryExpression');
        expect((deeper.right as IntLiteral).literal.value).toBe(4);
        expect((deeper.left as IntLiteral).literal.value).toBe(3);


        // y = y >= 2s4 && !false
        expect(
            ((assignemnts[2] as Assignment).expression as BinaryExpression).operator
        ).toBe('&&');
        expect(
            ((assignemnts[2] as Assignment).expression as BinaryExpression).right.$type
        ).toBe('LogicalNegation');
        deeper = ((assignemnts[2] as Assignment).expression as BinaryExpression).left as BinaryExpression;
        expect(deeper.operator).toBe('>='); 
        expect(deeper.right.$type).toBe('IntLiteral');
        expect(deeper.left.$type).toBe('Lval');
        expect((deeper.left as Lval).ref.$refText).toBe('y');

        //y = 5s6 + 4u8 + 5s6 + 6s6;
        expect(((assignemnts[3] as Assignment).expression as BinaryExpression).right.$type).toBe('IntLiteral');
        expect(((assignemnts[3] as Assignment).expression as BinaryExpression).left.$type).toBe('BinaryExpression');
        expect((((assignemnts[3] as Assignment).expression as BinaryExpression).left as BinaryExpression).left.$type).toBe('BinaryExpression');
        expect(((((assignemnts[3] as Assignment).expression as BinaryExpression).left as BinaryExpression).left as BinaryExpression).left.$type).toBe('IntLiteral');

        //y = (1s2 {4s4 : 2s4} 2s2) { 4s4 : 6s4 } -3s4;
        expect((assignemnts[4] as Assignment).expression?.$type).toBe('ProbabilisticAssignment');
        expect(((assignemnts[4] as Assignment).expression as ProbabilisticAssignment).head.$type).toBe('ProbabilisticAssignment');
        expect(((assignemnts[4] as Assignment).expression as ProbabilisticAssignment).fallbacks.length).toBe(2);
        expect((((assignemnts[4] as Assignment).expression as ProbabilisticAssignment).fallbacks[0] as IntLiteral).literal.sign).toBe('-');
    })
});

describe('Parsing tests for all rules', () => {
    let program: Program; // declare in outer scope; adjust type as necessary

    // Use beforeAll to parse the document once before running tests
    it('should read and parse the Program from the path', async () => {
        const filePath = join(__dirname, '../samples/everyLangRule.pomc');
        // Read the file content as a string using UTF-8 encoding
        const fileContent = readFileSync(filePath, 'utf8');
        const document = await parse(fileContent);
        // Optionally, you can perform a validation check
        expect(checkDocumentValid(document)).toBeFalsy();
        // Assign the program from the parsed document
        program = document.parseResult.value;
        expect(isProgram(program)).toBeTruthy();
    });

    it('should correctly parse the global declarations, their type (the size) and names', () => {
        expect(program.declarations.length).toBe(3);
        expect(
            s`${program.declarations[0].names[0]} - ${program.declarations[1].names[0]} - ${program.declarations[2].names[0]}`
        ).toBe('globalFlag - numbers - test');
        //console.log(program.declarations[0].type)
        //expect(program.declarations[0]).toBe('bool');
        expect(program.declarations[1].type.prefix).toBe('s32');
        expect(program.declarations[1].type.$type).toBe('IntArray');
        expect((program.declarations[1].type as IntArray).size).toBe(10);
        expect(program.declarations[2].type.prefix).toBe('u16');
        expect(program.declarations[2].names.length).toBe(2);
    });

    it('should correctly parse the functions', () => {
        expect(program.functions.length).toBe(2);
        expect(
            s`${program.functions[0].name} - ${program.functions[1].name}`
        ).toBe('main - helper');
    });

    it('should correclty parse the helper-function', () => {
        var helper = program.functions[1];
        expect(helper.params).toBeTruthy();
        expect(helper.params?.parameters.length).toBe(2);
        expect(helper.params?.parameters[0].byRef).toBeTruthy();
        expect(helper.params?.parameters[0].name).toBe('count');
        expect(helper.params?.parameters[0].type.prefix).toBe('s32');
        //expect(helper.params?.parameters[1].type).toBe('flag');
        expect(helper.params?.parameters[1].name).toBe('flag');
        expect(helper.params?.parameters[1].byRef).toBeFalsy();
        expect(helper.declarations.length).toBe(1);

        expect(helper.body.statements.length).toBe(2);
        expect(helper.body.statements[0].$type).toBe('Assignment');
        expect(helper.body.statements[1].$type).toBe('Observation');
        expect(((helper.body.statements[1] as Observation).condition as BoolLiteral).literal).toBeTruthy();
    });

    it('should correclty parse the main-function', () => {
        var helper = program.functions[0];
        expect(helper.params).toBeFalsy();
        //expect(helper.params?.parameters[1].type).toBe('flag');
        expect(helper.declarations.length).toBe(2);

        // Assignemnt using dsitributions
        expect(helper.body.statements.length).toBe(10);
        expect(helper.body.statements[0].$type).toBe('Assignment');
        expect((helper.body.statements[0] as Assignment).leftValue.ref).toBeTruthy();
        expect((helper.body.statements[0] as Assignment).expression).toBeFalsy();
        expect((helper.body.statements[0] as Assignment).distribution?.name).toBe('Bernoulli');
        expect((helper.body.statements[0] as Assignment).distribution?.lower).toBeFalsy();
        expect((helper.body.statements[0] as Assignment).distribution?.p).toBeTruthy();

        expect((helper.body.statements[1] as Assignment).leftValue.ref).toBeTruthy();
        expect((helper.body.statements[1] as Assignment).expression).toBeFalsy();
        expect((helper.body.statements[1] as Assignment).distribution?.name).toBe('Uniform');
        expect((helper.body.statements[1] as Assignment).distribution?.lower).toBeTruthy();
        expect((helper.body.statements[1] as Assignment).distribution?.p).toBeFalsy();

        // Probabilistic assignment: numbers[0u1] = 5s32 { 3s32 : 7s32 } 3s32;
        expect((helper.body.statements[2] as Assignment).leftValue.ref).toBeTruthy();
        expect((helper.body.statements[2] as Assignment).distribution).toBeFalsy();
        expect(
            (((helper.body.statements[2] as Assignment).expression as ProbabilisticAssignment).head as IntLiteral).literal?.value // .epression as Intliteral -
        ).toBe(5);
        expect(
            (((helper.body.statements[2] as Assignment).expression as ProbabilisticAssignment).head as IntLiteral).literal?.suffix
        ).toBe('s32');
        const probAssign = ((helper.body.statements[2] as Assignment).expression as ProbabilisticAssignment)
        expect(probAssign.probabilities.length).toBe(1);
        expect(
            s`${(probAssign.probabilities[0].numerator as IntLiteral).literal?.value} : ${(probAssign.probabilities[0].denominator as IntLiteral).literal?.value}`
        ).toBe('3 : 7');
        expect(probAssign.fallbacks.length).toBe(1);
        expect((probAssign.fallbacks[0] as IntLiteral).literal?.value).toBe(3);

        //FuncCall: helper(42s32, false);
        const funcCall = helper.body.statements[3] as FuncCall;
        expect(funcCall.$type).toBe('FuncCall');
        expect(funcCall.argumentList).toBeTruthy();
        expect(funcCall.argumentList!.arguments.length).toBe(2);
        expect(
            s`${(funcCall.argumentList!.arguments[0].expression as IntLiteral).literal.value}${(funcCall.argumentList!.arguments[0].expression as IntLiteral).literal.suffix}`
        ).toBe('42s32');
        expect((funcCall.argumentList!.arguments[1].expression as BoolLiteral).literal).toBeFalsy();

        //Query: query helper(10s32, true);        
        expect(helper.body.statements[4].$type).toBe('Query');

        // Observation: observe (!globalFlag);
        const observation = helper.body.statements[5] as Observation;
        expect(observation.$type).toBe('Observation');
        expect(observation.condition.$type).toBe('LogicalNegation');


        //Throw statement: throw;
        expect(helper.body.statements[6].$type).toBe('Stmt');

        /* If–then–else statement (IfThenElse):
            if (localFlag) {
                x = x + numbers[1s1];
            } else {
                throw;
            }
        */
        const ifThenElse = helper.body.statements[7] as IfThenElse;
        expect(ifThenElse.$type).toBe('IfThenElse');
        expect(ifThenElse.condition.$type).toBe('Lval');
        expect(ifThenElse.thenBlock!.statements[0].$type).toBe('Assignment');
        expect(
            ((((ifThenElse.thenBlock!.statements[0] as Assignment).expression as BinaryExpression).right as Lval).index as IntLiteral).literal.value
        ).toBe(1);
        expect(ifThenElse.elseBlock!.statements[0].$type).toBe('Stmt');
        expect(ifThenElse.thenBlock!.statements.length + ifThenElse.elseBlock!.statements.length).toBe(2);

        /* While loop (While):
             while (x < 100s32) {
                x = x + 1s32;
            }
        */
        const whileStmt = helper.body.statements[8] as While;
        expect(whileStmt.$type).toBe('While');
        expect((whileStmt.condition as BinaryExpression).operator).toBe('<');
        expect(whileStmt.whileBlock!.statements.length).toBe(1);

        /* Try–catch block (TryCatch):
            try {
                x = x + 1s32;
            } catch {
                throw;
            }
        */
        expect(helper.body.statements[9].$type).toBe('TryCatch');
        expect((helper.body.statements[9] as TryCatch).tryBlock!.statements.length).toBe(1);
        expect((helper.body.statements[9] as TryCatch).catchBlock!.statements.length).toBe(1);
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