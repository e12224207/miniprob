
import { AstNode } from "langium";
import {
    Distribution,
    IntLiteral,
    BoolLiteral,
    Lval, // Declarations and Parameters
    Expression
} from "../generated/ast.js"
import { inferType } from "./infer.js";

export type TypeDescription =
    | BooleanTypeDescription
    | IntegerTypeDescription
    | ArrayTypeDescription
    | DistributionTypeDescription
    | ErrorType;

export interface BooleanTypeDescription {
    readonly $type: "boolean"
    readonly literal?: BoolLiteral
}

export function createBooleanType(literal?: BoolLiteral): BooleanTypeDescription {
    return {
        $type: "boolean",
        literal
    };
}

export function isBooleanType(item: TypeDescription): item is BooleanTypeDescription {
    return item.$type === "boolean";
}

export interface IntegerTypeDescription {
    readonly $type: "integer",
    readonly width: number;
    readonly signed: boolean,
    readonly literal?: IntLiteral
}

export function createIntegerType(width: number, signed: boolean, literal?: IntLiteral): IntegerTypeDescription {

    return {
        $type: "integer",
        width,
        signed,
        literal
    };
}

export function isIntegerType(item: TypeDescription): item is IntegerTypeDescription {
    return item.$type === "integer";
}

export interface ArrayTypeDescription {
    readonly $type: "array",
    readonly elementType: TypeDescription;
}

export function createArrayType(elementType: TypeDescription) : ArrayTypeDescription {
    return {
        $type: 'array',
        elementType
    }
}

export function isArrayType(item: TypeDescription) : item is ArrayTypeDescription {
    return item.$type === 'array';
}
export function isArrayIntegerType(item: TypeDescription): item is ArrayTypeDescription {
    return isArrayType(item) && item.elementType.$type === 'integer';
}

export interface DistributionTypeDescription {
    readonly $type: "integer"
    readonly distribution?: Distribution
    readonly args: TypeDescription[]
}
export function createDistributionType(args: TypeDescription[], literal?: Distribution): DistributionTypeDescription {
    return {
        $type: 'integer',
        distribution: literal,
        args
    };
}
export function isDistributionType(item: TypeDescription): item is DistributionTypeDescription {
    return item.$type === 'integer' && (item as DistributionTypeDescription).args != undefined;//todo results in error?
}

export interface ErrorType {
    readonly $type: "error"
    readonly source?: AstNode
    readonly message: string
}

export function createErrorType(message: string, source?: AstNode): ErrorType {
    return {
        $type: "error",
        message,
        source
    };
}

export function isErrorType(item: TypeDescription): item is ErrorType {
    return item.$type === "error";
}

export function typeToString(item: TypeDescription): string {
    if (isIntegerType(item)) {
        return `${item.signed ? 'signed' : 'unsigned'} ${item.$type}${item.width ?? ''}`
    } else if (isArrayIntegerType(item)) {
        return `[${typeToString(item.elementType)}]`
    }
    return item.$type;
}