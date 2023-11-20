import {
  generateStatements,
  generateTypes,
} from '@aws-amplify/graphql-generator';
import { Source } from 'graphql';
import {
  type GenerationResult,
  type GraphqlTypesGenerator,
  type TypesGenerationParameters,
} from './model_generator.js';

/**
 * Generates GraphQL types for a given AppSync API
 */
export class AppSyncGraphqlTypesGenerator implements GraphqlTypesGenerator {
  /**
   * Configures the AppSyncGraphqlTypesGenerator
   */
  constructor(
    private fetchSchema: () => Promise<string>,
    private resultBuilder: (fileMap: Record<string, string>) => GenerationResult
  ) {}

  generateTypes = async ({
    target,
    multipleSwiftFiles,
  }: TypesGenerationParameters) => {
    const schema = await this.fetchSchema();

    if (!schema) {
      throw new Error('Invalid schema');
    }

    const generatedStatements = generateStatements({
      schema,
      target: 'graphql',
    });

    const queries = Object.entries(generatedStatements).map(
      ([filename, contents]) => new Source(contents, filename)
    );

    const generatedTypes = await generateTypes({
      schema,
      target,
      queries,
      multipleSwiftFiles,
    });

    return this.resultBuilder(generatedTypes);
  };
}
