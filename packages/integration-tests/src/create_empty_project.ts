import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { shortUuid } from './short_uuid.js';

const TEST_PROJECT_PREFIX = 'test-project';

/**
 * Creates an empty project directory within the specified parent
 * This is primarily consumed to create an empty Amplify project, however is split
 */
export const createEmptyProject = async (
  projectDirName: string,
  parentDir: string
): Promise<{
  projectName: string;
  projectRoot: string;
}> => {
  const projectName = `${TEST_PROJECT_PREFIX}-${projectDirName}-${shortUuid()}`;
  const projectRoot = await fs.mkdtemp(path.join(parentDir, projectDirName));

  return { projectName, projectRoot };
};
