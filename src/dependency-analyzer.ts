import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';
import { resolveIncompatibilitiesAndNotify } from './dependency-resolver';

interface DependencyData {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

class DependencyAnalyzer {
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

  private areVersionsCompatible(versions: Record<string, string>): boolean {
    for (const [packageNameA, versionA] of Object.entries(versions)) {
      for (const [packageNameB, versionB] of Object.entries(versions)) {
        if (packageNameA !== packageNameB) {
          const isCompatible =
            semver.satisfies(versionA, versionB) || semver.satisfies(versionB, versionA);
          if (!isCompatible) {
            console.warn(
              `${packageNameA} (${versionA}) and ${packageNameB} (${versionB}) have incompatible versions`
            );
            return false;
          }
        }
      }
    }
    return true;
  }

  async analyze(): Promise<void> {
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

      let incompatibilitiesFound = false;

      for (const packageNameA in allDependencies) {
        for (const packageNameB in allDependencies) {
          if (packageNameA !== packageNameB) {
            const versionA = allDependencies[packageNameA];
            const versionB = allDependencies[packageNameB];
            if (!semver.satisfies(versionA, versionB) && !semver.satisfies(versionB, versionA)) {
              console.warn(
                `${packageNameA} (${versionA}) and ${packageNameB} (${versionB}) have incompatible versions`
              );
              incompatibilitiesFound = true;
            }
          }
        }
      }

      if (!incompatibilitiesFound) {
        console.log('All dependencies have compatible versions.');
      } else {
        console.warn('Some dependencies have incompatible versions. Resolution required.');

        try {
          console.log('Resolving incompatibilities...');
          await resolveIncompatibilitiesAndNotify();
          console.log('Incompatibilities resolved.');
        } catch (error) {
          console.error('Error resolving incompatibilities:', error);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
}

(async () => {
  const analyzer = new DependencyAnalyzer();
  await analyzer.analyze();
})();
