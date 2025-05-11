import { AstNodeDescription, AstNodeDescriptionProvider, AstUtils, DefaultScopeProvider, LangiumCoreServices, MapScope, ReferenceInfo, Scope, URI, DefaultIndexManager } from "langium";
import { Decl, FileImport, Func, isArg, isDecl, isFunc, isFuncCall, isLval, isProgram, Program } from "./generated/ast.js";
import { dirname, join, posix } from "path";
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
            if (isFuncCall(container)) {
                const program = AstUtils.getContainerOfType(container, isProgram)!;                
                // filter Func for body -> only real Func and not ghost Reference(=current input)
                let descriptions = program.functions.filter(func => func.body).map(func => this.astNodeDescriptionProvider.createDescription(func, func.name));

                if (program.fileImports && program.fileImports.length > 0) {                    
                    const document = AstUtils.getDocument(container);
                    const uri = document.uri;
                    console.log("FileIMport of: " + uri.toString())
                    descriptions = descriptions.concat(this.getImportedScope(program.fileImports, uri, Func));
                }
                
                return new MapScope(descriptions);
            } 
            else if (isLval(container)) {
                const enclosingFunction = AstUtils.getContainerOfType(container, isFunc);
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
                } else { // usage of args and lval outside of functions currently not allowed by grammar                    
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

    // only works for imports which are already parsed at elast once (globalScope is cached)
    private getImportedScope(fileImports: FileImport[], currentUri: URI, targetNodeType: string): AstNodeDescription[] {
        const importUris = fileImports.map(f => {
            const filePath = posix.join(dirname(currentUri.path), f.file);
            return currentUri.with({path: filePath}).toString();
        });

        if (targetNodeType === Func) {
            console.log("Import uris for functions" + [...importUris]);
            var temp = this.indexManager.allElements(Decl, new Set<string>(importUris)).toArray();
            console.log(temp.length)
            temp.forEach(t => console.log(t.name));
            return temp;
        } else if (targetNodeType === Decl) {
            var temp = this.indexManager.allElements(Decl, new Set<string>(importUris)).filter(decl => !decl.path.includes('function')).toArray();
            console.log(temp.length)
            temp.forEach(t => console.log(t.name));
            return temp;
        }

        return [];
    }
}