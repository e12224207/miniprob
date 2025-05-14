import { AstNode } from "langium";
import { BinaryExpression, LogicalNegation, IntLiteral, BoolLiteral, ProbabilisticAssignment, Lval, Assignment, Distribution, isIntLiteral, isBoolLiteral, isLval, isLogicalNegation, isBinaryExpression, isDistribution, isProbabilisticAssignment, isAssignment, DeclOrParam, isType } from "../generated/ast.js";
import { TypeDescription, createArrayType, createBooleanType, createDistributionType, createErrorType, createIntegerType, isIntegerType } from "./description.js";

export function inferType(node: AstNode | undefined, cache: Map<AstNode, TypeDescription>): TypeDescription {
    let type: TypeDescription | undefined;
    if (!node) {
        return createErrorType('Could not infer type for undefined', node);
    }
    const existing = cache.get(node);
    if (existing) {
        return existing;
    }
    // Prevent recursive inference errors
    cache.set(node, createErrorType('Recursive definition', node));

    if (isBoolLiteral(node)) {
        type = createBooleanType(node);
    } else if (isIntLiteral(node)) {
        //check for inner conflicts 
        if (node.literal.sign === '-' && node.literal.suffix[0] !== 's') {
            return createErrorType('Negatives value cannot be stored in unsigned integer.', node);
        }

        try {
            var interpetedSuffix = parseTag(node.literal.suffix);
            if(node.literal.value > Math.pow(2, interpetedSuffix.width)) {
                return createErrorType(`Value ${node.literal.value} does not fit into integer with width ${interpetedSuffix.width}`, node);
            }
            type = createIntegerType(interpetedSuffix.width, interpetedSuffix.signed, node);
        } catch (err) {
            if (err instanceof Error) {
                type = createErrorType(`Could not infer type for ${node.$type}: ${err.message}`, node);
            }
        }
    } else if (isLval(node)) { // maybe check for already exisitng parser error to avoid unnecessary stacking error messages
        type = inferLvalReference(node, cache);
    } else if (isLogicalNegation(node)) {
        type = createBooleanType();
    } else if (isBinaryExpression(node)) {
        type = inferBinaryExpression(node, cache);
    } else if (isDistribution(node)) {
        type = inferDistribution(node, cache);
    } else if (isProbabilisticAssignment(node)) {
        type = inferProbabilisticAssignment(node, cache);
    }
    if (!type) {
        type = createErrorType('Could not infer type for ' + node.$type, node);
    }

    cache.set(node, type);
    return type;
}

function inferLvalReference(lval: Lval, cache: Map<AstNode, TypeDescription>): TypeDescription {

    var referencedNode = lval.ref.ref;
    if (!referencedNode) {
        return createErrorType('Missing linked reference.', lval);
    }

    if (isType(referencedNode.type) && ['IntArray', 'IntType'].includes(referencedNode.type.$type)) { // isType only checks for IntTypeBoolType is a made of a keyword, not included in TypeUnion)
        //check if whole array is referenced
        try {
            var interpetedPrefix = parseTag(referencedNode.type.prefix);
            if (referencedNode.type.$type === 'IntArray' && !lval.index) {
                return createArrayType(createIntegerType(interpetedPrefix.width, interpetedPrefix.signed))
            } else {
                return createIntegerType(interpetedPrefix.width, interpetedPrefix.signed);
            }
        } catch (err: any) {
            if (err instanceof Error) {
                return createErrorType('Could not infer type of Lval reference: ' + err.message, lval);
            }
        }
        return createErrorType('Could not infer type of Lval reference.', lval)
    } else {
        return createBooleanType();
    }

}
function parseTag(input: string): { signed: boolean, width: number } {

    const prefix = input.charAt(0);

    if (prefix !== 'u' && prefix !== 's') {
        throw new Error(`Unexpected prefix "${prefix}"`);
    }
    // slice off the first char and parse the rest
    const value = parseInt(input.slice(1), 10);
    if (Number.isNaN(value)) {
        throw new Error(`Invalid number in "${input}"`);
    }
    return { signed: prefix === 's', width: value };
}

function inferBinaryExpression(expr: BinaryExpression, cache: Map<AstNode, TypeDescription>): TypeDescription {
    if (['-', '*', '/', '%', '+'].includes(expr.operator)) {
        const left = inferType(expr.left, cache);
        const right = inferType(expr.right, cache);
        if (isIntegerType(left) && isIntegerType(right)) {
            var biggerWidth = left.width > right.width ? left.width : right.width;
            var signed = left.signed || right.signed;
            return createIntegerType(biggerWidth, signed);
        } else {
            return createErrorType('Could not infer type from binary expression due to conflicted state.');
        }
    } else if (['&&', '||', '<', '<=', '>', '>=', '==', '!='].includes(expr.operator)) {
        return createBooleanType();
    }
    return createErrorType('Could not infer type from binary expression - unkown operator', expr);
}

function inferDistribution(distribution: Distribution, cache: Map<AstNode, TypeDescription>): TypeDescription {
    var args = [];
    if (distribution.upper) {
        args.push(inferType(distribution.upper, cache));
        args.push(inferType(distribution.lower, cache));
    } else if (distribution.name) {
        args.push(inferType(distribution.p, cache));
        args.push(inferType(distribution.q, cache));
    }

    return args.every(type => type.$type == 'integer') ?
        createDistributionType(distribution, args) : createErrorType('Distribution arguments must be integer.', distribution);
}

function inferProbabilisticAssignment(assignment: ProbabilisticAssignment, cache: Map<AstNode, TypeDescription>): TypeDescription {
    var head = inferType(assignment.head, cache);
    const fallbacks = [];
    for (const fallback of assignment.fallbacks) {
        fallbacks.push(inferType(fallback, cache));
    }
    return fallbacks.every(typeDesc => typeDesc.$type === head.$type) ?
        head : createErrorType('Possible results do not fit the each others type.', assignment);
}