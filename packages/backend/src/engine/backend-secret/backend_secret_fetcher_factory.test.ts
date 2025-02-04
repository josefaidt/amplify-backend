import { App, Stack } from 'aws-cdk-lib';
import { describe, it } from 'node:test';
import { BackendSecretFetcherProviderFactory } from './backend_secret_fetcher_provider_factory.js';
import { BranchBackendIdentifier } from '@aws-amplify/platform-core';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import {
  BackendSecretFetcherFactory,
  SECRET_RESOURCE_PROVIDER_ID,
} from './backend_secret_fetcher_factory.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const secretResourceType = 'Custom::SecretFetcherResource';
const backendId = 'testId';
const branchName = 'testBranch';
const secretName1 = 'testSecretName1';
const secretLastUpdated = '1245462';
const secretName2 = 'testSecretName2';
const uniqueBackendIdentifier: UniqueBackendIdentifier =
  new BranchBackendIdentifier(backendId, branchName);

void describe('getOrCreate', () => {
  const providerFactory = new BackendSecretFetcherProviderFactory();
  const resourceFactory = new BackendSecretFetcherFactory(providerFactory);

  void it('create different secrets', () => {
    const app = new App();
    const stack = new Stack(app);
    stack.node.setContext('secretLastUpdated', secretLastUpdated);
    resourceFactory.getOrCreate(stack, secretName1, uniqueBackendIdentifier);
    resourceFactory.getOrCreate(stack, secretName2, uniqueBackendIdentifier);

    const template = Template.fromStack(stack);
    template.resourceCountIs(secretResourceType, 2);
    let customResources = template.findResources(secretResourceType, {
      Properties: {
        backendId,
        branchName,
        secretName: secretName1,
        secretLastUpdated,
      },
    });
    assert.equal(Object.keys(customResources).length, 1);

    customResources = template.findResources(secretResourceType, {
      Properties: {
        backendId,
        branchName,
        secretName: secretName2,
      },
    });
    assert.equal(Object.keys(customResources).length, 1);

    // only 1 secret fetcher lambda and 1 resource provider lambda are created.
    const providers = template.findResources('AWS::Lambda::Function');
    const names = Object.keys(providers);
    assert.equal(Object.keys(names).length, 2);
    assert.equal(
      names.filter((name) => name.startsWith(SECRET_RESOURCE_PROVIDER_ID))
        .length,
      2
    );
  });

  void it('does not create duplicate resource for the same secret name', () => {
    const app = new App();
    const stack = new Stack(app);
    resourceFactory.getOrCreate(stack, secretName1, uniqueBackendIdentifier);
    resourceFactory.getOrCreate(stack, secretName1, uniqueBackendIdentifier);

    const template = Template.fromStack(stack);
    template.resourceCountIs(secretResourceType, 1);
    const customResources = template.findResources(secretResourceType);
    const resourceName = Object.keys(customResources)[0];

    const body = customResources[resourceName]['Properties'];
    assert.strictEqual(body['backendId'], backendId);
    assert.strictEqual(body['branchName'], branchName);
    assert.strictEqual(body['secretName'], secretName1);
  });
});
