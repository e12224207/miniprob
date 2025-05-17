import { AstNode, AstNodeDescription, AstUtils, type ValidationAcceptor, type ValidationChecks } from 'langium';
import { isLval, isProgram, isFunc, Lval, Decl, type MiniProbAstType, type Param, Func, FuncCall, ProbabilisticAssignment, ProbChoice, IntLiteral, isDecl, isParam, Assignment, Distribution, BinaryExpression, LogicalNegation, IntegerLiteral } from '../generated/ast.js'; //Person from here
import type { MiniProbServices } from '../mini-prob-module.js';
import { SharedMiniProbCache } from './mini-prob-caching.js';
import { DistributionTypeDescription, ErrorType, IntegerTypeDescription, isErrorType, isIntegerType, TypeDescription, typeToString } from '../type-system/description.js';
import { inferType } from '../type-system/infer.js';
import { isCompatible } from '../type-system/compatible.js';
import { isLegalOperation } from '../type-system/operation.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: MiniProbServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.MiniProbValidator;
    const checks: ValidationChecks<MiniProbAstType> = {
        Lval: validator.checkArrayAccess,
        FuncCall: validator.checkFunctionCalls,
        Func: validator.checkMainFunction,
        ProbChoice: validator.checkProbabilisticChoices,
        Assignment: validator.checkAssignments,
        Distribution: validator.checkDistributions,
        BinaryExpression: validator.checkBinaryExpressions,
        LogicalNegation: validator.checkUnaryExpressions,
        IntegerLiteral: validator.checkIntegerLiteral
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
    //TODO check id unique
    //TODO? check if ref param is lval and no expression (warning)
    //TODO? statically evaluate operations warning
    //TODO? check Distribution arg1 > arg2

    checkArrayAccess(node: Lval, accept: ValidationAcceptor) {

        if (node.index) {
            const map = this.getTypeCache();
            const indexType = inferType(node.index, map);
            if (isErrorType(indexType)) {
                accept('error', indexType.message, {
                    node: indexType.source ?? node,
                    property: 'index'
                });
                return;
            }
            if (!isIntegerType(indexType)) {
                accept('error', `Index type \'${typeToString(indexType)}\' not compatible with integer`, {
                    node,
                    property: 'index'
                });
            }
        }
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

        //Check if number of arguments match
        var refNode = node.ref.ref;
        if (refNode) {
            var noMatchParams = refNode.params?.parameters.length != node.argumentList?.arguments.length;
            if (noMatchParams) {
                accept('error', 'Number of parameters does not match.', {
                    node,
                    property: 'argumentList'
                });
                return;
            }

            const map = this.getTypeCache();
            const parameterTypes = refNode.params?.parameters.map(param => inferType(param, map));
            const argumentTypes = node.argumentList?.arguments.map(arg => inferType(arg.expression, map));
            if (argumentTypes) {
                const callErrors = [];
                for (let i = 0; i < argumentTypes.length; i++) {
                    const arg = argumentTypes[i];
                    const param = parameterTypes![i];
                    let skipCompatibility = false;
                    if (isErrorType(arg)) {
                        callErrors.push({
                            node: node.argumentList!.arguments[i],
                            message: `Conflicting argument: ${arg.message}`
                        });
                        skipCompatibility = true;
                    }
                    if (isErrorType(param)) {
                        callErrors.push({
                            node: refNode.params!.parameters[i],
                            message: `Conflicting parameter: ${param.message}`
                        });
                        skipCompatibility = true;
                    }
                    // order of arguments in isCompatible important (param2 --comp--> param1)
                    if (!skipCompatibility && !isCompatible(parameterTypes![i], arg)) {
                        callErrors.push({
                            node: node.argumentList!.arguments[i],
                            message: `Argument type \'${typeToString(arg)}\' not compatible with \'${typeToString(parameterTypes![i])}\'`
                        });
                    }
                }

                for (const error of callErrors) {
                    accept('error', error.message, {
                        node: error.node,
                    })
                }
            }
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

    checkProbabilisticChoices(node: ProbChoice, accept: ValidationAcceptor) {
        const map = this.getTypeCache();

        const numerator = inferType(node.numerator, map);
        const denominator = inferType(node.denominator, map);

        let skipCompatibility = false;
        if (isErrorType(numerator)) {
            accept('error', numerator.message, {
                node,
                property: 'numerator'
            });
            skipCompatibility = true;
        }
        if (isErrorType(denominator)) {
            accept('error', denominator.message, {
                node,
                property: 'denominator'
            });
            skipCompatibility = true;
        }

        if (!skipCompatibility && !isLegalOperation(':', numerator, denominator)) {
            accept('error', `This operation \':\' is not possible with types \'${typeToString(numerator)}\' and \'${typeToString(denominator)}\'`, {
                node
            });
            return;
        }

        const num = (numerator as IntegerTypeDescription);
        const den = (denominator as IntegerTypeDescription);

        if (den.literal?.literal.value === 0) {
            accept('error', 'Division by 0 not possible', {
                node,
            });
            return;
        }
        if (num.signed || den.signed
            || (num.literal && den.literal && num.literal.literal.value > den.literal.literal.value)) {
            accept('error', 'Probability value must be 0...1 and cannot be negative', {
                node,
            });
        }

        // var e = numerator.literal.value / denominator.literal.value
        // if (e > 1) {
        //     accept('error', 'Resulting probability must be between 0..1', {
        //         node
        //     });
        // }
    }

    // checks whether or not the params are comatible witht expected integer type
    // the whole of the distribution is verified through assignment checks
    checkDistributions(node: Distribution, accept: ValidationAcceptor) {

        if ((node.name === 'Bernoulli' && (!node.q || !node.p)) || (node.name === 'Uniform' && (!node.upper || !node.lower))) {
            accept('error', 'Distributions expect two arguments', {
                node
            });
            return;
        }
        const map = this.getTypeCache();

        let skipCompatibility = false;
        let params: Array<{ property: 'q' | 'p' | 'lower' | 'upper'; expr: AstNode | undefined }> = [];

        switch (node.name) {
            case 'Bernoulli':
                params = [
                    { property: 'p', expr: node.p },
                    { property: 'q', expr: node.q }
                ];
                break;

            case 'Uniform':
                params = [
                    { property: 'lower', expr: node.lower },
                    { property: 'upper', expr: node.upper }
                ];
                break;

            default:
                // not a distribution we care about
                return;
        }

        // first pass: capture any propagated errors
        for (const { expr } of params) {
            const ty = inferType(expr, map);
            if (isErrorType(ty)) {
                accept('error', ty.message, {
                    node: ty.source ?? node
                });
                skipCompatibility = true;
            }
        }

        // second pass: if no errors, ensure each is integer
        if (!skipCompatibility) {
            for (const { property, expr } of params) {
                const ty = inferType(expr, map);
                if (!isIntegerType(ty)) {
                    accept(
                        'error',
                        `Argument type '${typeToString(ty)}' not compatible with 'integer'`,
                        { node, property }
                    );
                }
            }
        }

        // also examined in assignment validation
        // const type = inferType(node, map);
        // if (isErrorType(type)) {
        //     accept('error', type.message, {
        //         node: node
        //     });
        // }
    }

    // checks whether or not the members of the BinaryExpression are compatible
    // the whole of the binrayexpression is verfied thorugh the assignemnt checks
    checkBinaryExpressions(node: BinaryExpression, accept: ValidationAcceptor) {
        const map = this.getTypeCache();

        const leftType = inferType(node.left, map);
        const rightType = inferType(node.right, map);

        let skipCompatibility = false;
        if (isErrorType(leftType)) {
            accept('error', leftType.message, {
                node: leftType.source ?? node
            });
            skipCompatibility = true;
        }
        if (isErrorType(rightType)) {
            accept('error', rightType.message, {
                node: rightType.source ?? node
            });
            skipCompatibility = true;
        }

        if (!skipCompatibility && !isLegalOperation(node.operator, leftType, rightType)) {
            accept('error', `The operation \'${node.operator}\' cannot be performed on types \'${typeToString(leftType)}\' and \'${typeToString(rightType)}\'`, {
                node
            });
        }
    }

    // checks whether or not the members of the UnaryExpression is compatible
    // the whole of the unaryExpression is verfied thorugh the assignemnt checks
    checkUnaryExpressions(node: LogicalNegation, accept: ValidationAcceptor) {
        const map = this.getTypeCache();
        const operandType = inferType(node.operand, map);

        if (isErrorType(operandType)) {
            accept('error', operandType.message, {
                node: operandType.source ?? node
            });
            return;
        }

        if (!isLegalOperation(node.operator, operandType)) {
            accept('error', `The operation \'${node.operator}\' is not possible on type \'${typeToString(operandType)}\'`, {
                node,
                property: 'operand'
            });
        }
    }

    checkIntegerLiteral(node: IntegerLiteral, accept: ValidationAcceptor) {
        // get the exact slice of source text for this node
        const cst = node.$cstNode;
        if (!cst) return;
        if (/^(?![+-]?\d+[uUsS]\d+$).+/.test(cst.text)) {
            accept('error',
                'No spaces are allowed in integer literals',
                { node }
            );
        }
    }

    private getTypeCache(): Map<AstNode, TypeDescription> {
        return new Map();
    }
}
