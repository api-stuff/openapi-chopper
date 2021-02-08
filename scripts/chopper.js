#! /usr/bin/env node

const { argv } = require('yargs')
  .describe('input', 'Source OpenAPI specification document')
  .describe('output', 'Target OpenAPI specification document')
  .demandOption(['input', 'output']);
const fs = require('fs');
const YAML = require('yamljs');

const Chopper = require('../lib/chopper');

(async () => {
  try {
    if (argv._.length === 0) {
      throw new Error('List of endpoints targeted for chopping is required');
    }

    const chopper = new Chopper(argv.input, argv._);
    await chopper.chop();

    const stringifier = argv.output.match(/\.json$/) ? JSON : YAML;
    fs.writeFileSync(argv.output, stringifier.stringify(chopper.render(), 1000, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
