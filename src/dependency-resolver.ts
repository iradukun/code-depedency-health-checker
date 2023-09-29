import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import { exec } from 'child_process';
import { checkPackageManager } from './package-manager-checker';

interface DependencyData {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

class DependencyResolver {
  private readonly packageJsonPath: string;

  constructor() {
    this.packageJsonPath = path.resolve(process.cwd(), 'package.json');
  }

  private async readPackageJson(): Promise<DependencyData> {
    try {
      const packageJson = await fs.readJSON(this.packageJsonPath);
      return {
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
      };
    } catch (error) {
      throw new Error(`Error reading package.json: ${error}`);
    }
  }

  async resolveIncompatibilities(): Promise<void> {
    try {
      const { dependencies, devDependencies } = await this.readPackageJson();
      const allDependencies = { ...dependencies, ...devDependencies };

      for (const packageNameA in allDependencies) {
        for (const packageNameB in allDependencies) {
          if (packageNameA !== packageNameB) {
            const versionA = allDependencies[packageNameA];
            const versionB = allDependencies[packageNameB];
            if (!semver.satisfies(versionA, versionB) && !semver.satisfies(versionB, versionA)) {
                console.log("Versions are incompatible; try to resolve by updating using npm or yarn");
              // Versions are incompatible; try to resolve by updating using npm or yarn
              const result = await this.updateDependencyVersion(packageNameA, versionA, packageNameB, versionB);
              if (result.success) {
                console.log(result.message);
              } else {
                console.warn(result.message);
              }
            }
          }
        }
      }

      console.log('Dependency resolution complete.');
    } catch (error) {
      console.error(error);
    }
  }

  private async updateDependencyVersion(
    packageNameA: string,
    versionA: string,
    packageNameB: string,
    versionB: string
  ): Promise<{ success: boolean; message: string }> {
    const packageManager = await checkPackageManager();
    if (!packageManager) {
      return { success: false, message: 'Unable to determine the package manager.' };
    }
  
    const updateCommand = packageManager === 'yarn'
      ? `yarn upgrade ${packageNameA} ${packageNameB}`
      : `npm update ${packageNameA} ${packageNameB}`;
  
    return new Promise((resolve) => {
      exec(updateCommand, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, message: `Failed to resolve ${packageNameA} and ${packageNameB}: ${error.message}` });
        } else {
          resolve({ success: true, message: `Resolved ${packageNameA} and ${packageNameB} by updating versions.` });
        }
      });
    });
  }
}

(async () => {
  const resolver = new DependencyResolver();
  await resolver.resolveIncompatibilities();
})();
