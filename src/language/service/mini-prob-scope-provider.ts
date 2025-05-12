import { AstNodeDescription, AstNodeDescriptionProvider, AstUtils, DefaultScopeProvider, LangiumCoreServices, MapScope, ReferenceInfo, Scope, URI, DefaultIndexManager, Stream, stream } from "langium";
import { Decl, FileImport, Func, FuncCall, isArg, isDecl, isFunc, isFuncCall, isLval, isProgram, Program } from "../generated/ast.js";
import { dirname, join, posix } from "path";
import { SharedMiniProbCache } from "./mini-prob-caching.js";
import { MiniProbServices } from "../mini-prob-module.js";
// ScopeOptions AstNodeDescription

export class MiniProbScopeProvider extends DefaultScopeProvider {

    private astNodeDescriptionProvider: AstNodeDescriptionProvider;
    private readonly descriptionCache: SharedMiniProbCache;
    constructor(services: MiniProbServices) {
        super(services);
        //get some helper services
        this.astNodeDescriptionProvider = services.workspace.AstNodeDescriptionProvider;
        this.descriptionCache = services.caching.MiniProbCache;
    }
    override getScope(context: ReferenceInfo): Scope {

        const container = context.container;
        if (context.property === 'ref' && container) {
            const program = AstUtils.getContainerOfType(container, isProgram)!;
            var includeFileImports = program.fileImports && program.fileImports.length > 0;
            if (isFuncCall(container)) {
                const descriptions = this.descriptionCache.get(AstUtils.getDocument(container).uri, Func, () =>
                    // filter Func for body -> only real Func and not ghost Reference(=current input)
                    new MapScope(program.functions.filter(func => func.body)
                        .map(func => this.astNodeDescriptionProvider.createDescription(func, func.name)))
                ).getAllElements();

                //check for imported functions
                var importedDescriptions: Stream<AstNodeDescription> = stream();
                if (includeFileImports) {
                    const document = AstUtils.getDocument(container);
                    const uri = document.uri;
                    importedDescriptions = this.getImportedScope(program.fileImports, uri, Func);
                }

                return new MapScope(stream(descriptions, importedDescriptions));
            }
            else if (isLval(container)) {
                const document = AstUtils.getDocument(container);

                const enclosingFunction = AstUtils.getContainerOfType(container, isFunc);
                if (enclosingFunction) {

                    const programDeclarations = program.declarations || [];
                    const descriptions = this.descriptionCache.get(document.uri, Decl, () => new MapScope(programDeclarations.flatMap(decl =>
                        decl.names.map(name => this.astNodeDescriptionProvider.createDescription(decl, name))
                    ))).getAllElements();

                    const localDeclarations = enclosingFunction.declarations || [];
                    const localDescriptions = [...localDeclarations].flatMap(decl =>
                        decl.names.map(name => this.astNodeDescriptionProvider.createDescription(decl, name))
                    );

                    // check for referenced function parameters
                    const localFunctionParameter = enclosingFunction.params?.parameters;
                    if (localFunctionParameter) {
                        localDescriptions.push(...localFunctionParameter.map(p => this.astNodeDescriptionProvider.createDescription(p, p.name)));
                    }

                    //check for imported declarations
                    var importedDescriptions: Stream<AstNodeDescription> = stream();
                    if (includeFileImports) {
                        const document = AstUtils.getDocument(container);
                        const uri = document.uri;
                        importedDescriptions = this.getImportedScope(program.fileImports, uri, Decl);
                    }
                    return new MapScope(stream(descriptions, localDescriptions, importedDescriptions));
                } else { // usage of args and lval outside of functions currently not allowed by grammar
                    const programDeclarations = program.declarations || [];
                    const descriptions = this.descriptionCache.get(document.uri, Decl, () => new MapScope(programDeclarations.flatMap(decl =>
                        decl.names.map(name => this.astNodeDescriptionProvider.createDescription(decl, name))
                    ))).getAllElements();
                    return new MapScope(descriptions);
                }
            }
        }

        return super.getScope(context);
    }

    // only works for imports which are already parsed at elast once (globalScope is cached)
    private getImportedScope(fileImports: FileImport[], currentUri: URI, targetNodeType: string): Stream<AstNodeDescription> {
        const importUris = fileImports.map(f => {
            const filePath = posix.join(dirname(currentUri.path), f.file);
            return currentUri.with({ path: filePath }).toString();
        });
        // TODO make sure each uri's document is parsed at least once otherwise they are not indexed and not found

        const importKey = 'imported-';
        if (targetNodeType === Func) {
            const importedFuncDescriptions = this.descriptionCache.get(currentUri, importKey + targetNodeType,
                () => new MapScope(this.indexManager.allElements(Func, new Set<string>(importUris))));
            return importedFuncDescriptions.getAllElements();
        } else if (targetNodeType === Decl) {
            var temp = this.indexManager.allElements(Decl, new Set<string>(importUris));
            const importedDeclDescriptions = this.descriptionCache.get(currentUri, importKey + targetNodeType,
                () => new MapScope(temp)); //no extra filter necessary ?
            return importedDeclDescriptions.getAllElements();
        }

        return stream();
    }
}