import { glob } from 'glob';
import path from 'path';
import assert from 'node:assert';
import * as fse from 'fs-extra/esm';
import * as fs from 'fs';
import { ObjectPath, Predicate, assertCustomMatch } from './object_compare.js';

const UPDATE_SNAPSHOTS = process.env.UPDATE_INTEGRATION_SNAPSHOTS === 'true';

const matchHashedJsonFile: Predicate = (actual, expected) => {
  const jsonFileHashRegex = /^\/[a-z0-9]{64}\.json$/;
  return (
    typeof actual === 'string' &&
    jsonFileHashRegex.test(actual) &&
    typeof expected === 'string' &&
    jsonFileHashRegex.test(expected)
  );
};

const matchTimestamp: Predicate = (actual, expected) =>
  typeof actual === 'number' && typeof expected === 'number';

const nestedStackDescriptions = new Set([
  'An auto-generated nested stack for the @function directive.',
]);

const customMatchers: Map<ObjectPath, Predicate> = new Map([
  [
    [
      'Resources',
      'data7552DF31',
      'Properties',
      'TemplateURL',
      'Fn::Join',
      1,
      6,
    ],
    matchHashedJsonFile,
  ],
  [
    [
      'Resources',
      'auth179371D7',
      'Properties',
      'TemplateURL',
      'Fn::Join',
      1,
      6,
    ],
    matchHashedJsonFile,
  ],
  [
    [
      'Resources',
      'function1351588B',
      'Properties',
      'TemplateURL',
      'Fn::Join',
      1,
      6,
    ],
    matchHashedJsonFile,
  ],
  [
    [
      'Resources',
      'storage0EC3F24A',
      'Properties',
      'TemplateURL',
      'Fn::Join',
      1,
      6,
    ],
    matchHashedJsonFile,
  ],
  [
    [
      'Resources',
      'amplifyDataGraphQLAPIDefaultApiKey1C8ED374',
      'Properties',
      'Expires',
    ],
    matchTimestamp,
  ],
  [
    ['Description'],
    // the description field of the gql template contains a JSON string that includes "createdOn": "Linux|Mac|Windows"
    // this check just verifies that the string is valid JSON because the createdOn value is different for each platform
    // Deeply nested stacks may not adhere to this, so we check if the stack description is expected, short-circuiting parse.
    (actual) =>
      typeof actual === 'string' &&
      (nestedStackDescriptions.has(actual) || JSON.parse(actual)),
  ],
]);

/**
 * Essentially a snapshot validator.
 *
 * It checks that actualDir and expectedDir have the same files (ignoring ignoreFiles defined below)
 * It then checks that all JSON files parse to identical objects
 * It fails if a non-JSON file is found
 * @param actualDir The actual cdk synth output generated by the test
 * @param expectedDir The expected cdk synth output
 */
export const validateCdkOutDir = async (
  actualDir: string,
  expectedDir: string
) => {
  // These are CDK internal bookkeeping files that change across minor versions of CDK.
  // We only care about validating the CFN templates
  const ignoreFiles = ['tree.json', 'cdk.out', 'manifest.json', '.assets.json'];

  const actualPaths = await glob(path.join(actualDir, '*'));
  const expectedPaths = await glob(path.join(expectedDir, '*'));

  /**
   * Filter out ignoreFiles and sort
   */
  const normalize = (paths: string[]) =>
    paths
      .filter((p) => !ignoreFiles.some((ignoreFile) => p.endsWith(ignoreFile)))
      .filter((p) => !path.basename(p).startsWith('asset.'))
      .sort();

  const normalizedActualPaths = normalize(actualPaths);
  const normalizedExpectedPaths = normalize(expectedPaths);

  if (UPDATE_SNAPSHOTS) {
    normalizedActualPaths.forEach((actualPath) => {
      const destination = path.resolve(expectedDir, path.basename(actualPath));
      fse.copySync(actualPath, destination);
    });
    return;
  }

  assert.deepStrictEqual(
    normalizedActualPaths.map((fileName) => path.basename(fileName)),
    normalizedExpectedPaths.map((fileName) => path.basename(fileName))
  );

  // check that JSON files parse to the same object
  for (let i = 0; i < normalizedActualPaths.length; i++) {
    const actualFile = normalizedActualPaths[i];
    const expectedFile = normalizedExpectedPaths[i];
    if (path.extname(normalizedActualPaths[i]) !== '.json') {
      assert.fail(`Unknown file type ${actualFile}`);
    }
    const actualObj = JSON.parse(fs.readFileSync(actualFile, 'utf-8'));
    const expectedObj = JSON.parse(fs.readFileSync(expectedFile, 'utf-8'));

    // there are some CDK asset hashes that differ when the template is synthesized on different operating systems
    // we specify a custom match rule for some paths in the template to work around these differences
    assertCustomMatch(actualObj, expectedObj, customMatchers);
  }
};
