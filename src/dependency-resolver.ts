import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import * as execa from 'execa'; // For running Yarn commands

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
              // Versions are incompatible; try to resolve by updating
              const resolvedVersion = await this.findCompatibleVersion(packageNameA, packageNameB);
              if (resolvedVersion) {
                console.log(
                  `Resolved incompatibility between ${packageNameA} and ${packageNameB} by updating to ${resolvedVersion}`
                );
                allDependencies[packageNameA] = resolvedVersion;
                allDependencies[packageNameB] = resolvedVersion;
              } else {
                console.warn(`Unable to resolve incompatibility between ${packageNameA} and ${packageNameB}`);
              }
            }
          }
        }
      }

      // Update package.json with resolved versions
      const updatedPackageJson = { ...dependencies, ...devDependencies };
      await fs.writeJSON(this.packageJsonPath, updatedPackageJson, { spaces: 2 });
      console.log('Dependency resolution complete. package.json updated.');
    } catch (error) {
      console.error(error);
    }
  }

  private async findCompatibleVersion(packageA: string, packageB: string): Promise<string | undefined> {
    try {
      // Use Yarn to find a compatible version
      const result = await execa('yarn', ['upgrade', '--json', `${packageA}@*`, `${packageB}@*`]);

      // Parse Yarn's JSON output to get the updated version
      const yarnOutput = JSON.parse(result.stdout);
      const updatedPackages = yarnOutput.data.body.upgrades;
      if (updatedPackages) {
        const updatedPackage = updatedPackages[`${packageA}@${packageB}`];
        if (updatedPackage) {
          return updatedPackage.latest;
        }
      }
    } catch (error) {
      console.error(`Error resolving compatibility for ${packageA} and ${packageB}: ${error}`);
    }

    return undefined;
  }
}

// Usage
(async () => {
  const resolver = new DependencyResolver();
  await resolver.resolveIncompatibilities();
})();
