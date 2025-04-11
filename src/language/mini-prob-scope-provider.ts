import { AstNode, AstNodeDescriptionProvider, AstUtils, DefaultScopeProvider, LangiumCoreServices, MapScope, ReferenceInfo, Scope } from "langium";
import { Func, isArg, isFunc, isFuncCall, isLval, isProgram, Program } from "./generated/ast.js";
// ScopeOptions AstNodeDescription

export class MiniProbScopeProvider extends DefaultScopeProvider {

    private astNodeDescriptionProvider: AstNodeDescriptionProvider;
    constructor(services: LangiumCoreServices) {
        super(services);
        //get some helper services
        this.astNodeDescriptionProvider = services.workspace.AstNodeDescriptionProvider;
    }
    override getScope(context: ReferenceInfo): Scope {

        const container = context.container;

        if (context.property === 'ref' && container) {
            console.log(container.$type)
            if (isFuncCall(container)) { // scope functions based on params count and byRef�
                const program = AstUtils.getContainerOfType(container, isProgram)!;
                // filter Func for body -> only real Func and not ghost Reference
                const descriptions = program.functions.filter(func => func.body).map(func => this.astNodeDescriptionProvider.createDescription(func, func.name));
                console.log(program.functions);
                return new MapScope(descriptions);
            } else if (isLval(container) || isArg(container)) { //scope lval based on arraytype �
                console.log("lval container reference")
                const enclosingFunction = AstUtils.getContainerOfType(container, isFunc);
                console.log("Enclosed byf Func?" + enclosingFunction !== undefined)
                if (enclosingFunction) {
                    const localDeclarations = enclosingFunction.declarations || [];
                    const enclosingProgram = AstUtils.getContainerOfType(container, isProgram)!;
                    const programDeclarations = enclosingProgram.declarations || [];
                    const descriptions = [...localDeclarations, ...programDeclarations].flatMap(decl =>
                        decl.names.map(name => this.astNodeDescriptionProvider.createDescription(decl, name))
                    );

                    // check for referenced function parameters
                    const localFunctionParameter = enclosingFunction.params?.parameters;
                    if (localFunctionParameter) {
                        descriptions.push(...localFunctionParameter.map(p => this.astNodeDescriptionProvider.createDescription(p, p.name)));
                    }
                    return new MapScope(descriptions);
                } else { // usage of args and lval currently not allowed by grammar
                    const enclosingProgram = AstUtils.getContainerOfType(container, isProgram)!;
                    const programDeclarations = enclosingProgram.declarations || [];
                    const descriptions = [...programDeclarations].flatMap(decl =>
                        decl.names.map(name => this.astNodeDescriptionProvider.createDescription(decl, name))
                    );
                    return new MapScope(descriptions);
                }
            }
        }

        return super.getScope(context);
    }
}