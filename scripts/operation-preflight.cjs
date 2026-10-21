// Read-only inventory: does not install tools, start services, or access credentials.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function probe(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000 });
  return {
    available: !result.error && result.status === 0,
    version: !result.error && result.status === 0
      ? (result.stdout || result.stderr).trim().split(/\r?\n/)[0] : null,
  };
}
const services = ['personas-capacitacion', 'aprendizaje-evaluacion', 'simulacion-logistica'].map(name => {
  const base = path.join(root, 'services', name);
  const pom = fs.readFileSync(path.join(base, 'pom.xml'), 'utf8');
  return {
    name,
    wrapperPresent: ['mvnw', 'mvnw.cmd', '.mvn/wrapper/maven-wrapper.properties'].every(file => fs.existsSync(path.join(base, file))),
    javaRelease: pom.match(/<maven.compiler.release>([^<]+)</)?.[1] || null,
    postgresIntegrationProfile: pom.includes('<id>postgres-it</id>'),
  };
});
const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8', windowsHide: true });
console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  scope: 'Read-only local operational preparation; not a build or deployment verification',
  branch: branch.status === 0 ? branch.stdout.trim() : null,
  tools: {
    java: probe('java', ['-version']), node: probe('node', ['--version']),
    git: probe('git', ['--version']), docker: probe('docker', ['--version']),
    aws: probe('aws', ['--version']),
  },
  services,
  files: Object.fromEntries(['Jenkinsfile', 'compose.yaml', 'render.yaml'].map(file => [file, fs.existsSync(path.join(root, file))])),
  existingGitHubWorkflow: {
    javaSetupPresent: ci.includes('actions/setup-java'),
    mavenInvocationPresent: /mvnw|mvn\s/.test(ci),
    conditionalDeploymentPresent: ci.includes('DEPLOY_ENABLED'),
  },
  pending: [
    'Confirm Jenkins execution host and provision a dedicated agent',
    'Use an isolated CI workspace and test databases; do not reuse the local supervisor or DPAPI configuration',
    'Implement and execute the Java and Node pipeline with JUnit report collection',
    'Select and validate publication, AWS infrastructure, and monitoring in separate supervised steps',
  ],
  productionReady: false,
}, null, 2));
