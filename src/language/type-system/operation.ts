import { isBooleanType, isIntegerType, TypeDescription } from './description.js';

export function isLegalOperation(
  operator: string,
  left: TypeDescription,
  right?: TypeDescription
): boolean {
  if (['+', '-', '/', '*', '%', '<', '<=', '>', '>=', ':'].includes(operator)) {
    if (!right || !left) {
      return false;
    }
    return isIntegerType(left) && isIntegerType(right);
  } else if (['&&', '||'].includes(operator)) {
    return isBooleanType(left) && right !== undefined && isBooleanType(right);
  } else if (operator === '!') {
    return isBooleanType(left);
  }
  return true;
}
