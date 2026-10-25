// Fail the build if the provider has not rolled out the security release.
const minimum = '24.22.1';
const actual = process.versions.node.split('.').map(Number);
const required = minimum.split('.').map(Number);
if (actual[0] !== required[0] || actual[1] < required[1] ||
    (actual[1] === required[1] && actual[2] < required[2])) {
  throw new Error(`Node ${minimum} or newer within major 24 is required; got ${process.version}`);
}
console.info(JSON.stringify({ event: 'node-runtime-build', node: process.version, openssl: process.versions.openssl, undici: process.versions.undici }));
