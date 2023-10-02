import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Detects the package manager (npm or Yarn) used in the project based on the presence
 * of 'yarn' dependency in the package.json file.
 * @returns The detected package manager ('npm' or 'yarn'), or null if detection fails.
 */
export async function checkPackageManager(): Promise<string | null> {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  
  try {
    const packageJson = await fs.readJSON(packageJsonPath);
    // Check if 'yarn' is present in dependencies or devDependencies
    if (packageJson.dependencies && packageJson.dependencies.yarn) {
      return 'yarn';
    }
    if (packageJson.devDependencies && packageJson.devDependencies.yarn) {
      return 'yarn';
    }
    // Default to 'npm' if 'yarn' is not found
    return 'npm';
  } catch (error) {
    // Log and return null on error
    console.error('Error reading package.json:', error);
    return null;
  }
}
