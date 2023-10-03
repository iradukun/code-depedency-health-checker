import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import { exec } from 'child_process';
import { checkPackageManager } from './package-manager-checker';

interface DependencyData {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export class DependencyResolver {
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

  async resolveIncompatibilitiesAndInstall(): Promise<void> {
    try {
      await this.resolveIncompatibilities();

      const packageManager = await checkPackageManager();
      if (!packageManager) {
        console.error('Unable to determine the package manager.');
        return;
      }

      const installCommand = packageManager === 'yarn' ? 'yarn' : 'npm install --force';
      await this.runCommand(installCommand);

      console.log('Dependency resolution and installation complete.');
    } catch (error) {
      console.error('Error resolving incompatibilities:', error);
    }
  }

  private async runCommand(command: string): Promise<void> {
    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error running command: ${command}\n`, error);
          resolve();
        } else {
          resolve();
        }
      });
    });
  }
  async resolveIncompatibilities(): Promise<void> {
    try {
      const { dependencies, devDependencies } = await this.readPackageJson();
      const allDependencies = { ...dependencies, ...devDependencies };
      const incompatibilities = [];
  
      for (const packageNameA in allDependencies) {
        for (const packageNameB in allDependencies) {
          if (packageNameA !== packageNameB) {
            const versionA = allDependencies[packageNameA];
            const versionB = allDependencies[packageNameB];
            if (!semver.satisfies(versionA, versionB) && !semver.satisfies(versionB, versionA)) {
              console.warn(
                `${packageNameA} (${versionA}) and ${packageNameB} (${versionB}) have incompatible versions`
              );
              incompatibilities.push({ packageNameA, versionA, packageNameB, versionB });
            }
          }
        }
      }
  
      if (incompatibilities.length > 0) {
        console.warn('Some dependencies have incompatible versions. Resolution required.');
  
        for (const incompatibility of incompatibilities) {
          const result = await this.updateDependencyVersion(
            incompatibility.packageNameA,
            incompatibility.versionA,
            incompatibility.packageNameB,
            incompatibility.versionB
          );
          if (result.success) {
            console.log(result.message);
          } else {
            console.warn(result.message);
          }
        }
  
        // After resolving incompatibilities, call the installation function
        await this.resolveIncompatibilitiesAndInstall();
      }
  
      console.log('Dependency resolution complete.');
    } catch (error) {
      console.error('Error resolving incompatibilities:', error);
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

export async function resolveIncompatibilitiesAndNotify(): Promise<void> {
  const resolver = new DependencyResolver();
  await resolver.resolveIncompatibilities();
  console.log('Dependency resolution complete.');
  await resolver.resolveIncompatibilitiesAndInstall();
  console.log("Deps installation complete");
}

