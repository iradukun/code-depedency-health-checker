import * as fs from 'fs-extra';
import * as path from 'path';

export async function checkPackageManager(): Promise<string | null> {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  try {
    const packageJson = await fs.readJSON(packageJsonPath);
    if (packageJson.dependencies && packageJson.dependencies.yarn) {
      return 'yarn';
    }
    if (packageJson.devDependencies && packageJson.devDependencies.yarn) {
      return 'yarn';
    }
    return 'npm';
  } catch (error) {
    console.error('Error reading package.json:', error);
    return null;
  }
}
