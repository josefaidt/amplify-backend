import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectBase } from './test_project_base.js';
import { createEmptyProject } from '../create_empty_project.js';

/**
 * The monorepo test for "moduleResolution": "bundler"
 */
export class MonorepoProject extends TestProjectBase {
  readonly sourceProjectDirPath = '../../test-projects/monorepo-project';
  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/packages/my-backend/amplify`;
  readonly sourceProjectAmplifyDirPath: URL = new URL(
    this.sourceProjectAmplifyDirSuffix,
    import.meta.url
  );

  /**
   * Create a test project instance.
   */
  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient
  ) {
    super(name, projectDirPath, projectAmplifyDirPath, cfnClient);
  }

  /**
   * Creates a test project directory and instance.
   */
  static createProject = async (
    e2eProjectDir: string,
    cfnClient: CloudFormationClient
  ): Promise<MonorepoProject> => {
    const { projectName, projectRoot } = await createEmptyProject(
      'monorepo-project',
      e2eProjectDir
    );

    /** manually pass the preconstructed amplify dir path */
    const projectAmplifyDir = 'packages/my-backend/amplify';
    /**
     * @todo need to peel this TestProjectBase apart to support monorepos
     * it's currently attempting to invoke sandbox at the projectRoot instead of the workspace package's root
     */
    const project = new MonorepoProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      cfnClient
    );
    await fs.cp(
      project.sourceProjectAmplifyDirPath,
      project.projectAmplifyDirPath,
      {
        recursive: true,
      }
    );
    return project;
  };

  assertPostDeployment = async (): Promise<void> => {
    const clientConfigStats = await fs.stat(
      path.join(this.projectDirPath, 'amplifyconfiguration.json')
    );
    assert.ok(clientConfigStats.isFile());
  };
}
