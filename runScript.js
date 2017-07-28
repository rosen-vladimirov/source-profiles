const getShellVars = require(".");
const env = getShellVars.getEnvironmentVariables();

console.log("Get shell vars returns the following environment variables:");
console.log(env);
