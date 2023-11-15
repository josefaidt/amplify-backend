import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createEmptyProject } from './create_empty_project.js';

/**
 * Creates an empty Amplify project directory within the specified parent
 * The project contains an empty `amplify` directory and a package.json file with a name
 */
export const createEmptyAmplifyProject = async (
  projectDirName: string,
  parentDir: string
): Promise<{
  projectName: string;
  projectRoot: string;
  projectAmplifyDir: string;
}> => {
  const { projectName, projectRoot } = await createEmptyProject(
    projectDirName,
    parentDir
  );
  await fs.writeFile(
    path.join(projectRoot, 'package.json'),
    JSON.stringify({ name: projectName, type: 'module' }, null, 2)
  );

  const projectAmplifyDir = path.join(projectRoot, 'amplify');
  await fs.mkdir(projectAmplifyDir);

  return { projectName, projectRoot, projectAmplifyDir };
};
