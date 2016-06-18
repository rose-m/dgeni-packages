var ts = require('typescript');
var path = require('canonical-path');

module.exports = function tsParser(createCompilerHost, log) {

  return {

    // These are the extension that we should consider when trying to load a module
    // During migration from Traceur, there is a mix of `.ts`, `.es6` and `.js` (atScript)
    // files in the project and the TypeScript compiler only looks for `.ts` files when trying
    // to load imports.
    extensions: ['.ts', '.js'],

    // The options for the TS compiler
    options: {
      allowNonTsExtensions: true,
      charset: 'utf8'
    },

    parse: function (fileNames, baseDir) {

      // "Compile" a program from the given module filenames, to get hold of a
      // typeChecker that can be used to interrogate the modules, exports and so on.
      var host = createCompilerHost(this.options, baseDir, this.extensions);
      var program = ts.createProgram(fileNames, this.options, host);
      var typeChecker = program.getTypeChecker();

      // Create an array of module symbols for each file we were given
      var moduleSymbols = [];
      fileNames.forEach(function (fileName) {
        var sourceFile = program.getSourceFile(fileName);

        if (!sourceFile) {
          throw new Error('Invalid source file: ' + fileName);
        } else if (sourceFile.symbol) {
          moduleSymbols.push(sourceFile.symbol);
        } else {
          var statementsWithSymbols = sourceFile.statements.filter(function (stmt) {
            return !!stmt.symbol;
          });

          if (statementsWithSymbols.length) {
            extractModuleOrNamespaceSymbols(typeChecker, moduleSymbols, statementsWithSymbols);
          } else {
            // Some files contain only a comment and no actual module code
            log.warn('No module code found in ' + fileName);
          }
        }
      });


      moduleSymbols.forEach(function (tsModule) {

        // The type checker has a nice helper function that returns an array of Symbols
        // representing the exports for a given module
        tsModule.exportArray = typeChecker.getExportsOfModule(tsModule);

        // Although 'star' imports (e.g. `export * from 'some/module';) get resolved automatically
        // by the compiler/binder, it seems that explicit imports (e.g. `export {SomeClass} from 'some/module'`)
        // do not so we have to do a little work.
        tsModule.exportArray.forEach(function (moduleExport) {
          if (moduleExport.flags & ts.SymbolFlags.Alias) {
            // To maintain the alias information (particularly the alias name)
            // we just attach the original "resolved" symbol to the alias symbol
            moduleExport.resolvedSymbol = typeChecker.getAliasedSymbol(moduleExport);
          }
        });
      });

      moduleSymbols.typeChecker = typeChecker;

      return {
        moduleSymbols: moduleSymbols,
        typeChecker: typeChecker,
        program: program,
        host: host
      };

      function extractModuleOrNamespaceSymbols(typeChecker, moduleSymbols, statementsWithSymbols) {
        statementsWithSymbols.forEach(function (stmt) {
          var symbol = getClosestModuleDeclarationWithExports(stmt.symbol);
          if (symbol) {
            moduleSymbols.push(symbol);
          }
        });

        function getClosestModuleDeclarationWithExports(symbol) {
          if (!typeChecker.getExportsOfModule(symbol).length && symbol.declarations && symbol.declarations.length == 1) {
            var declaration = symbol.declarations[0];
            if (declaration.kind === ts.SyntaxKind.ModuleDeclaration && declaration.body.symbol) {
              return getClosestModuleDeclarationWithExports(declaration.body.symbol);
            }
          }
          return symbol;
        }
      }
    }
  };


};
