import { AstNode, AstNodeDescription, AstUtils, type ValidationAcceptor, type ValidationChecks } from 'langium';
import { isLval, isProgram, isFunc, Lval, Decl, type MiniProbAstType, type Param, Func, FuncCall, ProbabilisticAssignment, ProbChoice, IntLiteral, isDecl, isParam, Assignment } from '../generated/ast.js'; //Person from here
import type { MiniProbServices } from '../mini-prob-module.js';
import { SharedMiniProbCache } from './mini-prob-caching.js';
import { isErrorType, TypeDescription, typeToString } from '../type-system/description.js';
import { inferType } from '../type-system/infer.js';
import { isCompatible } from '../type-system/compatible.js';

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
        ProbChoice: validator.checkProbabilisticAssignment,
        Assignment: validator.checkAssignments
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

    checkAssignments(node: Assignment, accept: ValidationAcceptor) {
        var map = this.getTypeCache();
        const leftType = inferType(node.leftValue, map);
        var rightType;
        if (node.expression) {
            rightType = inferType(node.expression, map);
        } else {
            rightType = inferType(node.distribution, map);
        }

        var skipAssignErr = false;
        if (isErrorType(leftType)) {
            skipAssignErr = true;
            accept('error', leftType.message, {
                node: leftType.source ?? node                
            })
        }
        if (isErrorType(rightType)) {
            skipAssignErr = true;
            accept('error', rightType.message, {
                node: rightType.source ?? node                                
            })
        }

        if (!skipAssignErr && !isCompatible(leftType, rightType)) {
            accept('error', `Type ${typeToString(rightType)} is not assignable to ${typeToString(leftType)}.`, {
                node,
                property: 'expression'
            })
        }
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

        if (node.ref.error)
            return;

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

    private getTypeCache(): Map<AstNode, TypeDescription> {
        return new Map();
    }
}
