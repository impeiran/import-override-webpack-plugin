"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
class ImportOverrideWebpackPlugin {
    namespace = 'ImportOverridePlugin';
    options = {};
    constructor(options) {
        this.options = options || {};
        if (this.options.namespace) {
            this.namespace = this.options.namespace;
        }
    }
    apply(compiler) {
        if (this.options && !Object.keys(this.options).length) {
            return;
        }
        compiler.hooks.compilation.tap(this.namespace, (compilation) => {
            const resolverHook = compilation.resolverFactory.hooks.resolveOptions;
            // inject plugin
            resolverHook.for('normal').tap(this.namespace, (options) => {
                const plugins = options.plugins ? options.plugins.slice() : [];
                // ensure inject once
                if (plugins.some(v => v && v.name === this.namespace)) {
                    return options;
                }
                // inject
                plugins.push({
                    name: this.namespace,
                    apply: this.override.bind(this)
                });
                // new resolve options
                return {
                    ...options,
                    plugins
                };
            });
        });
    }
    override(resolver) {
        const { beforeResolve, resolve: userResolver, alias: aliasMap } = this.options;
        const target = resolver.ensureHook('resolve');
        resolver.getHook('described-resolve').tapAsync(this.namespace, (context, resolveContext, callback) => {
            // final callback to resolve the path
            const triggerOverride = (ret, message) => {
                return resolver.doResolve(target, ret, message, resolveContext, (error, result) => {
                    if (error) {
                        return callback(error);
                    }
                    if (result) {
                        return callback(null, result);
                    }
                    return callback();
                });
            };
            // the import path declared in module
            const importPath = context.request;
            if (!importPath)
                return callback();
            // check if needs to override
            if (typeof beforeResolve === 'function' &&
                !beforeResolve(importPath, context)) {
                return callback();
            }
            // alias
            if (aliasMap) {
                for (const currentAlias in aliasMap) {
                    const currentResultPath = aliasMap[currentAlias];
                    // hit the alias
                    if (importPath.startsWith(currentAlias + '/')) {
                        // replace & get the new import path
                        const newImportPath = importPath.replace(currentAlias, currentResultPath);
                        const result = {
                            ...context,
                            fullySpecified: false,
                            request: newImportPath
                        };
                        const message = `alias map ${importPath} to ${newImportPath}`;
                        this.log(message);
                        return triggerOverride(result, message);
                    }
                }
            }
            // handle the user resolve
            if (userResolver) {
                const userResolvePath = userResolver(importPath, context);
                const result = {
                    ...context,
                    fullySpecified: false,
                    request: userResolvePath
                };
                const message = `resolve ${importPath} to ${userResolvePath}`;
                this.log(message);
                return triggerOverride(result, message);
            }
            callback();
        });
    }
    log(message) {
        if (!this.options.log)
            return;
        console.log((chalk_1.default.green('\n' +
            '[override] ' +
            message +
            '\n')));
    }
}
exports.default = ImportOverrideWebpackPlugin;
//# sourceMappingURL=index.js.map