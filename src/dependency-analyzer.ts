import * as fs from 'fs-extra';
import * as path from 'path';

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
      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};

      return { dependencies, devDependencies };
    } catch (error) {
      throw new Error(`Error reading package.json: ${error}`);
    }
  }

  async analyze(): Promise<void> {
    try {
      const { dependencies, devDependencies } = await this.readPackageJson();

      this.logDependencies('Dependencies', dependencies);
      this.logDependencies('Dev Dependencies', devDependencies);
    } catch (error) {
      console.error(error);
   
    }
  }

  private logDependencies(label: string, dependencies: Record<string, string>): void {
    console.log(`${label}:`);
    for (const [packageName, version] of Object.entries(dependencies)) {
      console.log(`- ${packageName}: ${version}`);
    }
  }
}

// Usage
(async () => {
  const analyzer = new DependencyAnalyzer();
  await analyzer.analyze();
})();
