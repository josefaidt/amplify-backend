import { createRequire } from 'node:module';
import { defineBackend } from '@aws-amplify/backend';
import { hello } from 'shared-module';
// this will error with "moduleResolution": "node16" or "nodenext"
import * as relative from './relative_file';

const require = createRequire(import.meta.url);

// this will error with "moduleResolution": "node16" or "nodenext"
console.log(require.resolve('shared-package'));

// this is fine regardless of moduleResolution setting
hello('world');

defineBackend({});
