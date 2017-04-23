/**
 * exports
 */

/* Node modules */

/* Third-party modules */

/* Files */

module.exports = compile => varName => {
  if (varName === 'default') {
    if (compile) {
      return 'export default';
    }

    return 'exports.default =';
  }

  if (compile) {
    return `export const ${varName}`;
  }

  return `exports.${varName}`;
};
