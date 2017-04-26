/**
 * imports
 */

/* Node modules */

/* Third-party modules */

/* Files */

module.exports = compile => (pkgName, varName) => {
  if (!varName) {
    varName = pkgName;
  }

  if (compile) {
    return `import ${varName} from '${pkgName}';`;
  }

  return `const ${varName} = require('${pkgName}');`;
};
