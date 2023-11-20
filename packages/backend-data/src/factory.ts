import { type Construct } from 'constructs';
import {
  type AuthResources,
  type BackendOutputStorageStrategy,
  type ConstructContainerEntryGenerator,
  type ConstructFactory,
  type ConstructFactoryGetInstanceProps,
  type ResourceProvider,
} from '@aws-amplify/plugin-types';
import { AmplifyData } from '@aws-amplify/data-construct';
import { type GraphqlOutput } from '@aws-amplify/backend-output-schemas';
import * as path from 'path';
import { type DataProps } from './types.js';
import { convertSchemaToCDK } from './convert_schema.js';
import {
  type FunctionInstanceProvider,
  buildConstructFactoryFunctionInstanceProvider,
  convertFunctionNameMapToCDK,
} from './convert_functions.js';
import {
  type ProvidedAuthConfig,
  buildConstructFactoryProvidedAuthConfig,
  convertAuthorizationModesToCDK,
  isUsingDefaultApiKeyAuth,
} from './convert_authorization_modes.js';
import { validateAuthorizationModes } from './validate_authorization_modes.js';

/**
 * Singleton factory for AmplifyGraphqlApi constructs that can be used in Amplify project files
 */
class DataFactory implements ConstructFactory<AmplifyData> {
  private generator: ConstructContainerEntryGenerator;

  /**
   * Create a new AmplifyConstruct
   */
  constructor(
    private readonly props: DataProps,
    private readonly importStack = new Error().stack
  ) {}

  /**
   * Gets an instance of the Data construct
   */
  getInstance = (props: ConstructFactoryGetInstanceProps): AmplifyData => {
    const { constructContainer, outputStorageStrategy, importPathVerifier } =
      props;
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'data', 'resource'),
      'Amplify Data must be defined in amplify/data/resource.ts'
    );
    if (!this.generator) {
      this.generator = new DataGenerator(
        this.props,
        buildConstructFactoryProvidedAuthConfig(
          props.constructContainer
            .getConstructFactory<ResourceProvider<AuthResources>>(
              'AuthResources'
            )
            ?.getInstance(props)
        ),
        buildConstructFactoryFunctionInstanceProvider(props),
        outputStorageStrategy
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyData;
  };
}

class DataGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'data';
  private readonly defaultName = 'amplifyData';

  constructor(
    private readonly props: DataProps,
    private readonly providedAuthConfig: ProvidedAuthConfig | undefined,
    private readonly functionInstanceProvider: FunctionInstanceProvider,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<GraphqlOutput>
  ) {}

  generateContainerEntry = (scope: Construct) => {
    const authorizationModes = convertAuthorizationModesToCDK(
      this.functionInstanceProvider,
      this.providedAuthConfig,
      this.props.authorizationModes
    );

    validateAuthorizationModes(
      this.props.authorizationModes,
      authorizationModes
    );

    const sandboxModeEnabled = isUsingDefaultApiKeyAuth(
      this.providedAuthConfig,
      this.props.authorizationModes
    );

    const functionNameMap = convertFunctionNameMapToCDK(
      this.functionInstanceProvider,
      this.props.functions ?? {}
    );

    return new AmplifyData(scope, this.defaultName, {
      apiName: this.props.name,
      definition: convertSchemaToCDK(this.props.schema),
      authorizationModes,
      outputStorageStrategy: this.outputStorageStrategy,
      functionNameMap,
      translationBehavior: { sandboxModeEnabled },
    });
  };
}

/**
 * Creates a factory that implements ConstructFactory<AmplifyGraphqlApi>
 */
export const defineData = (props: DataProps): ConstructFactory<AmplifyData> =>
  new DataFactory(props, new Error().stack);
