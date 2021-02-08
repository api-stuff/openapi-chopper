const jsonpath = require('jsonpath');
const { JSONPath } = require('jsonpath-plus');
const SwaggerParser = require('@apidevtools/swagger-parser');

const dedupArray = (arr) => arr
  .reduce((output, path) => (output.indexOf(path) !== -1
    ? output : output.concat([path])), []);

const getReferences = (json) => dedupArray(JSONPath({ path: "$..['$ref']", json }));

const walkReferences = (json, references, allReferences) => {
  references
    .forEach((reference) => {
      const path = reference.replace('#', '$')
        .split('/').join('.');
      JSONPath({ path, json })
        .forEach((match) => {
          getReferences(match)
            .filter((ref) => allReferences.indexOf(ref) === -1)
            .forEach((newRef) => {
              allReferences.push(newRef);
              walkReferences(json, [newRef], allReferences);
            });
        });
    });
};

class Chopper {
  constructor(document, paths) {
    if (!document || !paths) {
      throw new Error('OpenAPI document and target paths must be passed to constructor');
    }

    if (paths.length === 0) {
      throw new Error('There is clearly no point in getting your chopper out as your paths are empty');
    }

    this.document = document;
    this.paths = paths;
  }

  async init() {
    // Validate document to ensure not chopping shit
    try {
      this.api = await SwaggerParser.parse(this.document);

      return true;
    } catch (err) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'test') console.error(err);

      if (err.message.match(/ENOENT/)) {
        throw new Error(`this.document not found: ${this.document}`);
      }

      if (err.message.match(/is not a valid JSON Schema/)) {
        throw new Error(`this.document is not a valid OpenAPI specification document: ${this.document}`);
      }

      throw err; // Badly behaved catch-all just in case
    }
  }

  async chop() {
    if (!this.api) {
      await this.init();
    }
    const pathNames = JSONPath({ path: '$.paths.*~', json: this.api });
    // console.log(JSONPath({ path: "$.paths..['$ref']", json: this.api }));

    const unknownPaths = this.paths
      .filter((path) => pathNames.indexOf(path) === -1);

    if (unknownPaths.length > 0) {
      throw new Error(`Unknown path(s) requested so cannot be chopped: ${unknownPaths.join(', ')}`);
    }

    // Filter Paths object to match input parameters
    this.api.paths = Object.keys(this.api.paths)
      .filter((path) => this.paths.indexOf(path) !== -1)
      .reduce((output, path) => Object.assign(output, { [path]: this.api.paths[path] }), {});

    // Find all schema references and copy
    const pathReferences = dedupArray(JSONPath({ path: "$..['$ref']", json: this.api.paths }));
    const allReferences = JSON.parse(JSON.stringify(pathReferences));

    // Collect up all references
    walkReferences(this.api, pathReferences, allReferences);

    const references = allReferences
      .reduce((output, reference) => {
        const path = reference
          .replace(/^#\//, '')
          .split('/');
        const parent = `$.${path.slice(0, path.length - 1).join('.')}`;
        const child = path.pop();

        return Object.assign(output, {
          [parent]: !output[parent]
            ? child
            : output[parent].concat(child),
        });
      }, {
        '$.components.callbacks': [],
        '$.components.examples': [],
        '$.components.headers': [],
        '$.components.links': [],
        '$.components.parameters': [],
        '$.components.requestBodies': [],
        '$.components.responses': [],
        '$.components.schemas': [],
        '$.components.securitySchemes': dedupArray(JSONPath({ path: '$..security.*.*~', json: this.api.paths })),
      });

    Object.keys(references)
      .forEach((parentPath) => {
        const children = references[parentPath];

        if (children.length === 0) {
          // Delete the section from the structure
          const unusedParentFragments = parentPath
            .split('.');
          const unusedParent = unusedParentFragments
            .slice(0, unusedParentFragments.length - 1)
            .join('.');
          const unusedChild = unusedParentFragments.pop();
          const parentObject = jsonpath.query(this.api, unusedParent).pop();

          delete parentObject[unusedChild];

          jsonpath.apply(this.api, parentPath, () => parentObject);
        } else {
          // Purge the unused references from the structure
          const parentObject = jsonpath.query(this.api, parentPath).pop();

          Object.keys(parentObject)
            .forEach((child) => {
              if (children.indexOf(child) === -1) {
                delete parentObject[child];
              }
            });

          jsonpath.apply(this.api, parentPath, () => parentObject);
        }
      });

    await SwaggerParser.parse(this.api);
  }

  render() {
    return this.api;
  }
}

module.exports = Chopper;
