/**
 * fileFactory
 */

/* Node modules */
const path = require('path');

/* Third-party modules */
const _ = require('lodash');
const program = require('ast-query');

/* Files */

const factories = {

  base (generator, opts) {
    opts.deps = opts.deps || {};
    opts.name = path.parse(opts.path).name;

    if (!generator.fs.exists(opts.path)) {
      /* Create the base file */
      const dest = generator.templatePath('../../../templates/base.txt');

      generator.fs.copyTpl(dest, opts.path, opts);
    }

    return generator.fs.read(opts.path);

    // const tree = program('');
    // tree.body.append(tree.verbatim('// hello'));
    // tree.body.append('const a = 1;' + tree.verbatim('ANYTHING'));
    // console.log(tree.var('a'));
    // console.log(tree.toString());
    // process.exit();
  },

  route (generator, opts) {
    const content = factories.base(generator, opts);

    console.log(content);
    process.exit();
  },

  truncate (string, length, useWordBoundary, separator = '...') {
    if (string.length <= length) {
      return string;
    }

    const subString = string.substr(0, length - 1);
    return (useWordBoundary
        ? subString.substr(0, subString.lastIndexOf(' '))
        : subString) + separator;
  },

  truncateWrap (string, length = 50) {
    if (_.isString(string) === false) { string = ''; }

    const out = [];

    let cursor = 0;
    do {
      const tmp = string.substr(cursor);

      const split = this.truncate(tmp, length, true, '');

      const trimmed = _.trim(split);

      if (trimmed.length > 0) {
        out.push(trimmed);
      }

      cursor += split.length;
    } while (cursor < string.length);

    return out;
  }

};

module.exports = (generator, factory, opts) => {
  opts.path = generator.destinationPath(opts.path);

  opts.description = factories.truncateWrap(opts.description);

  factories[factory](generator, opts);
};
