const chai = require('chai');
const fs = require('fs');
const YAML = require('yamljs');

const { expect, assert } = chai;

chai.use(require('chai-as-promised'));

const Chopper = require('../../lib/chopper');

describe(__filename, () => {
  describe('constructor', () => {
    it('Throw an error if document not passed', () => {
      const construct = () => new Chopper();

      expect(construct).to.throw('OpenAPI document and target paths must be passed to constructor');
    });
    it('Throw an error if paths are empty', () => {
      const construct = () => new Chopper(`${__dirname}/../data/petstore-input.yaml`, []);

      expect(construct).to.throw('There is clearly no point in getting your chopper out as your paths are empty');
    });
    it('Constructor executes successfully', () => {
      assert.isOk(new Chopper(`${__dirname}/../data/petstore.yaml`, ['/pet']));
    });
  });
  describe('init function', () => {
    it('Throw an error if document does not exist', async () => {
      const chopper = new Chopper(`${__dirname}/../data/unknown.yaml`, ['/pet']);

      await expect(chopper.init())
        .to.be.rejectedWith(`this.document not found: ${__dirname}/../data/unknown.yaml`);
    });
    it('Throw an error when bullshit is passed not OpenAPI', async () => {
      const chopper = new Chopper(`${__dirname}/../data/blank.yaml`, ['/pet']);

      await expect(chopper.init())
        .to.be.rejectedWith(`this.document is not a valid OpenAPI specification document: ${__dirname}/../data/blank.yaml`);
    });
    it('Initialises successfully', async () => {
      const chopper = new Chopper(`${__dirname}/../data/petstore-input.yaml`, ['/pet']);

      assert.isOk(await chopper.init());
    });
  });
  describe('chop function', () => {
    it('Throw an error when a requested path is not found', async () => {
      const chopper = new Chopper(`${__dirname}/../data/petstore-input.yaml`, ['/bananas']);

      await expect(chopper.chop())
        .to.be.rejectedWith('Unknown path(s) requested so cannot be chopped: /bananas');
    });
    it('Chops successfully', async () => {
      const expectedApiSpec = YAML.parse(fs.readFileSync(`${__dirname}/../data/petstore-output.yaml`, 'utf8'));
      const chopper = new Chopper(`${__dirname}/../data/petstore-input.yaml`, ['/pet', '/pet/findByStatus', '/pet/{petId}']);

      await chopper.chop();

      expect(chopper.render()).to.deep.equal(expectedApiSpec);
    });
  });
});
