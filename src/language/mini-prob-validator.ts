import type { /*ValidationAcceptor,*/ ValidationChecks } from 'langium';
import type { MiniProbAstType } from './generated/ast.js'; //Person from here
import type { MiniProbServices } from './mini-prob-module.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: MiniProbServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.MiniProbValidator;
    const checks: ValidationChecks<MiniProbAstType> = {
       // Person: validator.checkPersonStartsWithCapital
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class MiniProbValidator {

    // checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
    //     if (person.name) {
    //         const firstChar = person.name.substring(0, 1);
    //         if (firstChar.toUpperCase() !== firstChar) {
    //             accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
    //         }
    //     }
    // }

}
