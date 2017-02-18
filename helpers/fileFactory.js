/**
 * fileFactory
 */

/* Node modules */

/* Third-party modules */
const program = require('ast-query');

/* Files */

const tree = program('');
tree.body.append(tree.verbatim('// hello'));
tree.body.append('const a = 1;' + tree.verbatim('ANYTHING'));
console.log(tree.var('a'));
console.log(tree.toString());
process.exit();

const factories = {

  base () {

  },

  route () {

  }

};

module.exports = (generator, fileOpts, contentOpts) => {

  const file = generator.destinationPath(fileOpts.path);

  generator.fs.write(file, 'hello');

};
