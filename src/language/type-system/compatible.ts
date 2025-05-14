import { isBooleanType, isDistributionType, isIntegerType, TypeDescription } from "./description.js";

/**
 * Compare two TypeDescriptions by their `.$type` field,
 * with an extra size/sign check when both are integers
 * (and the right isn’t a distribution).
 *
 * @returns `true` if they’re compatible.
 */
export function isCompatible(
    left: TypeDescription,
    right: TypeDescription
): boolean {
    // If left is an integer but right isn't a distribution,
    // do the extra width/signed check
    if (!isDistributionType(right) && isIntegerType(left) && isIntegerType(right)) {
        // require same sign and at least as many bits on the left
        if (left.signed !== right.signed || left.width < right.width) {
            return false;
        }
    }
    //handle 0 and 1 assingments to boolean types
    if (isBooleanType(left) && isIntegerType(right)) {
        if (!right.signed && right.width === 1) {
            return true;
        } else if (!right.signed && right.literal && right.literal.literal.value <= 1) {
            return true;
        }
    }

    // Otherwise just match on the discriminant
    return left.$type === right.$type;
}
