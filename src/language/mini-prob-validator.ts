import { AstUtils, type ValidationAcceptor, type ValidationChecks } from 'langium';
import { isLval, isProgram, isFunc, Lval, type Decl, type MiniProbAstType, type Param, Func, FuncCall } from './generated/ast.js'; //Person from here
import type { MiniProbServices } from './mini-prob-module.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: MiniProbServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.MiniProbValidator;
    const checks: ValidationChecks<MiniProbAstType> = {
        Lval: validator.checkArrayType,
        FuncCall: validator.checkFunctionCalls
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class MiniProbValidator {

    checkFunctionCalls(node: FuncCall, accept: ValidationAcceptor) {
        const targetFunc = AstUtils.getContainerOfType(node, isProgram)!.functions.find(func => func.name === node.ref.$refText);
        if (targetFunc && node.argumentList?.arguments.length != targetFunc.params?.parameters.length) {
            accept('error', 'Number of parameters does not match.', {
                node,
                property: 'argumentList'
            });
        }
    }

    checkArrayType(node: Lval, accept: ValidationAcceptor) {

        const program = AstUtils.getContainerOfType(node, isProgram)!;
        const func = AstUtils.getContainerOfType(node, isFunc)!;

        const scopedArrays = [
            ...[...program.declarations, ...func.declarations]
                .filter(d => d.type.$type === 'IntArray')
                .flatMap(d => d.names),
            ...(func.params?.parameters ?? [])
                .filter(p => p.type.$type === 'IntArray')
                .map(p => p.name)
        ];

        if (node.index) {
            // handle index access of non array type
            if (!scopedArrays.includes(node.ref.$refText)) {
                accept('error', 'This is not an array type.', {
                    node,
                    property: 'index'
                });
            }
        } else {
            //handle missing index for array type / no arr1 = arr2 allowed; index must be present when referencing an array
            if (scopedArrays.includes(node.ref.$refText)) {
                accept('error', 'Missing indexed access of array type', {
                    node,
                    property: 'index'
                })
            }
        }
    }

}
