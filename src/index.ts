import type { Compiler, Compilation, Resolver, ResolveOptions } from 'webpack'

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

export type ResolveRequest = BaseResolveRequest & Partial<ParsedIdentifier>;

class ImportOverrideWebpackPlugin {
  namespace = 'ImportOverridePlugin'

  options: ImportOverrideOptions = {}

  constructor (options?: ImportOverrideOptions) {
    this.options = options || {}
    
    if (this.options.namespace) {
      this.namespace = this.options.namespace
    }
  }

  apply(compiler: Compiler) {
    if (this.options && !Object.keys(this.options).length) {
      return
    }

    compiler.hooks.compilation.tap(this.namespace, (compilation: Compilation) => {
      const resolverHook = compilation.resolverFactory.hooks.resolveOptions
      // inject plugin
      resolverHook.for('normal').tap(this.namespace, (options) => {
        const plugins = options.plugins ? options.plugins.slice() : []
        // ensure inject once
        if (plugins.some(v => v && (v as any).name === this.namespace)) {
          return options
        }
        // inject
        plugins.push({
          name: this.namespace,
          apply: this.override.bind(this)
        })
        // new resolve options
        return {
          ...options,
          plugins
        }
      })
    })
  }

  override (resolver: Resolver) {
    const {
      beforeResolve,
      resolve: userResolver,
      alias: aliasMap
    } = this.options

    const target = resolver.ensureHook('resolve')

    resolver.getHook('described-resolve').tapAsync(this.namespace, (context, resolveContext, callback) => {
      // final callback to resolve the path
      const triggerOverride = (ret: any, message: string) => {
        return resolver.doResolve(target, ret, message, resolveContext, (error: Error, result: any) => {
          if (error) {
            return callback(error)
          }
          if (result) {
            return callback(null, result)
          }
          return callback()
        })
      }
      // the import path declared in module
      const importPath = context.request

      if (!importPath) return callback()

      // check if needs to override
      if (
        typeof beforeResolve === 'function' &&
        !beforeResolve(importPath, context)
      ) {
        return callback()
      }

      // alias
      if (aliasMap) {
        for (const currentAlias in aliasMap) {
          const currentResultPath = aliasMap[currentAlias]
          // hit the alias
          if (importPath.startsWith(currentAlias + '/')) {
            // replace & get the new import path
            const newImportPath = importPath.replace(currentAlias, currentResultPath)
            const result = {
              ...context,
              fullySpecified: false,
              request: newImportPath
            }
            const message = `alias map ${importPath} to ${newImportPath}`
            this.log(message)
            return triggerOverride(result, message)
          }
        }
      }

      // handle the user resolve
      if (userResolver) {
        const userResolvePath = userResolver(importPath, context)

        const result = {
          ...context,
          fullySpecified: false,
          request: userResolvePath
        }

        const message = `resolve ${importPath} to ${userResolvePath}`
        this.log(message)

        return triggerOverride(result, message)
      }
      callback()
    })
  }

  log (message: string) {
    if (this.options.log) {
      console.log(
        '\n' +
        '[override] ' +
        message +
        '\n'
      )
    }
  }
}

export default ImportOverrideWebpackPlugin
 