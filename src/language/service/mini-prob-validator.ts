import { AstNodeDescription, AstUtils, type ValidationAcceptor, type ValidationChecks } from 'langium';
import { isLval, isProgram, isFunc, Lval, Decl, type MiniProbAstType, type Param, Func, FuncCall, ProbabilisticAssignment, ProbChoice, IntLiteral, isDecl, isParam } from '../generated/ast.js'; //Person from here
import type { MiniProbServices } from '../mini-prob-module.js';
import { SharedMiniProbCache } from './mini-prob-caching.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: MiniProbServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.MiniProbValidator;
    const checks: ValidationChecks<MiniProbAstType> = {
        Lval: validator.checkArrayType,
        FuncCall: validator.checkFunctionCalls,
        Func: validator.checkMainFunction,
        ProbChoice: validator.checkProbabilisticAssignment
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class MiniProbValidator {

    private readonly descriptionCache: SharedMiniProbCache;
    /**
     *
     */
    constructor(services: MiniProbServices) {
        this.descriptionCache = services.caching.MiniProbCache;
    }

    checkFunctionCalls(node: FuncCall, accept: ValidationAcceptor) {

        var refNode = node.ref.ref;
        var noMatchParams = refNode?.params?.parameters.length != node.argumentList?.arguments.length;
        if (noMatchParams) {
            accept('error', 'Number of parameters does not match.', {
                node,
                property: 'argumentList'
            });
        }
    }

    checkMainFunction(node: Func, accept: ValidationAcceptor) {
        if (node.name === 'main' && node.params) {
            accept('error', 'Function \'main\' cannot have any arguments.', {
                node,
                property: 'params'
            });
        }
    }

    checkProbabilisticAssignment(node: ProbChoice, accept: ValidationAcceptor) {
        if (node.denominator.$type != 'IntLiteral') {
            accept('error', 'Denominator must be a number', {
                node,
            });
        } else if (node.numerator.$type != 'IntLiteral') {
            accept('error', 'Numerator must be a number', {
                node,
            });
        }

        var numerator = node.numerator as IntLiteral; //TODO further unpacking of inltieral (lval, expression)
        var denominator = node.denominator as IntLiteral;
        var e = numerator.literal.value / denominator.literal.value
        if (e < 0) {
            accept('error', 'Negative values are not allowed', { //even reached? sign prop necessary
                node,
            });
        } else if (e > 1) {
            accept('error', 'Resulting probability must be between 0..1', {
                node
            });
        }
    }

    checkArrayType(node: Lval, accept: ValidationAcceptor) {

        const program = AstUtils.getContainerOfType(node, isProgram)!;
        const func = AstUtils.getContainerOfType(node, isFunc)!;

        const refNode = node.ref.ref;
        var referenceType = '';
        switch (refNode?.$type) {
            case 'Decl':
                referenceType = refNode!.type.$type;
                break;
            case 'Param':
                referenceType = refNode!.type.$type;
                break;
            default:
                break;
        }

        const scopedArrays = [ // use cahcing to also include imports
            ...[...program.declarations, ...func.declarations]
                .filter(d => d.type.$type === 'IntArray')
                .flatMap(d => d.names),
            ...(func.params?.parameters ?? [])
                .filter(p => p.type.$type === 'IntArray')
                .map(p => p.name)
        ];

        console.log(referenceType)

        if (node.index) {
            // handle index access of non array type
            if (referenceType !== 'IntArray') {
                accept('error', 'This is not an array type.', {
                    node,
                    property: 'ref'
                });
            }
        } else {
            //handle missing index for array type / no arr1 = arr2 allowed; index must be present when referencing an array
            if (referenceType === 'IntArray') {
                accept('error', 'Missing indexed access of array type', {
                    node,
                    property: 'ref'
                });
            }

        }
    }

}
