import type { Compiler, Resolver } from 'webpack';
/**
 * plugin options
 */
export interface ImportOverrideOptions {
    namespace?: string;
    beforeResolve?: (importPath: string, context: ResolveRequest) => boolean | void;
    resolve?: (importPath: string, context: ResolveRequest) => string;
    alias?: Record<string, string>;
    log?: boolean;
}
/**
 * from webpack, but not export
 */
export interface BaseResolveRequest {
    path: string | false;
    descriptionFilePath?: string;
    descriptionFileRoot?: string;
    descriptionFileData?: object;
    relativePath?: string;
    ignoreSymlinks?: boolean;
    fullySpecified?: boolean;
}
/**
 * from webpack, but not export
 */
export interface ParsedIdentifier {
    request: string;
    query: string;
    fragment: string;
    directory: boolean;
    module: boolean;
    file: boolean;
    internal: boolean;
}
export declare type ResolveRequest = BaseResolveRequest & Partial<ParsedIdentifier>;
declare class ImportOverrideWebpackPlugin {
    namespace: string;
    options: ImportOverrideOptions;
    constructor(options?: ImportOverrideOptions);
    apply(compiler: Compiler): void;
    override(resolver: Resolver): void;
    log(message: string): void;
}
export default ImportOverrideWebpackPlugin;
