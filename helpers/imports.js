/**
 * imports
 */

/* Node modules */

/* Third-party modules */

/* Files */

module.exports = compile => (pkgName, varName = null) => {
  if (!varName) {
    varName = pkgName;
  }

  if (compile) {
    return `import ${varName} from '${pkgName}';`
  }

  return `const ${varName} = require('${pkgName}');`;
};
