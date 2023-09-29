import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';

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

  private async updateDependencyVersion(packageName: string, newVersion: string): Promise<void> {
    try {
      const packageJson = await fs.readJSON(this.packageJsonPath);
      packageJson.dependencies[packageName] = newVersion;
      await fs.writeJSON(this.packageJsonPath, packageJson, { spaces: 2 });
      console.log(`Updated ${packageName} to version ${newVersion}`);
    } catch (error) {
      console.error(`Error updating ${packageName} version: ${error}`);
    }
  }

  async resolveIncompatibilities(): Promise<void> {
    try {
      const { dependencies, devDependencies } = await this.readPackageJson();
      const allDependencies = { ...dependencies, ...devDependencies };
      const dependencyVersions = Object.entries(allDependencies).reduce(
        (versions, [packageName, version]) => {
          versions[packageName] = version;
          return versions;
        },
        {} as Record<string, string>
      );

      for (const [packageNameA, versionA] of Object.entries(dependencyVersions)) {
        for (const [packageNameB, versionB] of Object.entries(dependencyVersions)) {
          if (packageNameA !== packageNameB) {
            const isCompatible =
              semver.satisfies(versionA, versionB) || semver.satisfies(versionB, versionA);
            if (!isCompatible) {
              // Resolve by updating to the latest compatible version
              const latestCompatibleVersion = semver.maxSatisfying(
                [versionA, versionB],
                `^${versionA}`
              );
              if (latestCompatibleVersion) {
                await this.updateDependencyVersion(packageNameA, latestCompatibleVersion);
              }
            }
          }
        }
      }

      console.log('Incompatibilities resolved.');
    } catch (error) {
      console.error(error);
    }
  }
}

// Usage
(async () => {
  const resolver = new DependencyResolver();
  await resolver.resolveIncompatibilities();
})();
