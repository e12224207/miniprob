import { AstNodeDescription, AstNodeDescriptionProvider, AstUtils, DefaultScopeProvider, LangiumCoreServices, MapScope, ReferenceInfo, Scope, URI, DefaultIndexManager } from "langium";
import { Decl, FileImport, Func, isArg, isDecl, isFunc, isFuncCall, isLval, isProgram, Program } from "../generated/ast.js";
import { dirname, join, posix } from "path";
import { SharedMiniProbCache } from "./mini-prob-caching.js";
import { MiniProbServices } from "../mini-prob-module.js";
// ScopeOptions AstNodeDescription

export class MiniProbScopeProvider extends DefaultScopeProvider {

    private astNodeDescriptionProvider: AstNodeDescriptionProvider;
    //private readonly descriptionCache: SharedMiniProbCache;
    constructor(services: MiniProbServices) {
        super(services);        
        //get some helper services
        this.astNodeDescriptionProvider = services.workspace.AstNodeDescriptionProvider;
        //this.descriptionCache = services.caching.MiniProbCache;
    }
    override getScope(context: ReferenceInfo): Scope {

        const container = context.container;
        if (context.property === 'ref' && container) {
            const program = AstUtils.getContainerOfType(container, isProgram)!;
            var includeFileImports = program.fileImports && program.fileImports.length > 0;
            if (isFuncCall(container)) {                
                // filter Func for body -> only real Func and not ghost Reference(=current input)
                const descriptions = program.functions.filter(func => func.body).map(func => this.astNodeDescriptionProvider.createDescription(func, func.name));

                //check for imported functions
                if (includeFileImports) {
                    const document = AstUtils.getDocument(container);
                    const uri = document.uri;
                    console.log("FileImport of: " + uri.toString())
                    descriptions.push(...this.getImportedScope(program.fileImports, uri, Func));
                }

                return new MapScope(descriptions);
            }
            else if (isLval(container)) {
                const enclosingFunction = AstUtils.getContainerOfType(container, isFunc);
                if (enclosingFunction) {
                    const localDeclarations = enclosingFunction.declarations || [];
                    const programDeclarations = program.declarations || [];
                    const descriptions = [...localDeclarations, ...programDeclarations].flatMap(decl =>
                        decl.names.map(name => this.astNodeDescriptionProvider.createDescription(decl, name))
                    );
                    // check for referenced function parameters
                    const localFunctionParameter = enclosingFunction.params?.parameters;
                    if (localFunctionParameter) {
                        descriptions.push(...localFunctionParameter.map(p => this.astNodeDescriptionProvider.createDescription(p, p.name)));
                    }
                    //check for imported declarations
                    if (includeFileImports) {
                        const document = AstUtils.getDocument(container);
                        const uri = document.uri;
                        descriptions.push(...this.getImportedScope(program.fileImports, uri, Decl));
                    }
                    return new MapScope(descriptions);
                } else { // usage of args and lval outside of functions currently not allowed by grammar
                    const programDeclarations = program.declarations || [];
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
            return currentUri.with({ path: filePath }).toString();
        });

        if (targetNodeType === Func) {            
            var temp = this.indexManager.allElements(Func, new Set<string>(importUris)).toArray();
            return temp;
        } else if (targetNodeType === Decl) {
            var temp = this.indexManager.allElements(Decl, new Set<string>(importUris)).filter(decl => !decl.path.includes('function')).toArray();
            return temp;
        }

        return [];
    }
}