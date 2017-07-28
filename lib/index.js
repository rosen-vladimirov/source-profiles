"use strict";

const fs = require("fs"),
	childProcess = require("child_process"),
	path = require("path"),
	_ = require("lodash"),
	processWrapper = require("./process-wrapper");

const addEtcPathToPath = (environmentVariables) => {
	const pathToEtcPath = "/etc/paths";

	if (fs.existsSync(pathToEtcPath)) {
		const additionsToPath = fs.readFileSync(pathToEtcPath, "utf8")
			.split('\n')
			.map(row => row.trim())
			.join(":");

		if (additionsToPath) {
			if (environmentVariables.PATH) {
				environmentVariables.PATH += `:${additionsToPath}`;
			} else {
				environmentVariables.PATH = additionsToPath;
			}
		}
	}

	return environmentVariables;
};

/**
 * Gets all environment variables that the user has in the default terminal.
 * @returns {object} Dictionary with key-value pairs of all environment variables.
 */
const getEnvironmentVariables = () => {
	if (processWrapper.getProcessPlatform() === "win32") {
		return process.env;
	}

	const shell = process.env && process.env.SHELL && path.basename(process.env.SHELL) || "bash",
		pathToShell = process.env && process.env.SHELL || "/bin/bash";

	try {
		let sourcedEnvironmentVars = childProcess.execSync(`${pathToShell} -ilc env`);

		if (sourcedEnvironmentVars) {
			// iTerm places some special symbols in the output, that break our parsing.
			// They are enabled in case you use iTerm's shell integration: https://www.iterm2.com/documentation-shell-integration.html
			// More information about the symbols: https://www.iterm2.com/documentation-escape-codes.html
			// The escape sequence starts with ESC symbol (0x1b) and ends with BEL symbol (0x07)
			// We do not need these symbols, so remove them and everything between them and parse the stdout after that.
			sourcedEnvironmentVars = sourcedEnvironmentVars.toString().replace(/\u001b.*?\u0007/g, "");
			const envVarsRegExp = /^(.+?)=(.*?$)/;
			let environmentVariables = {};

			sourcedEnvironmentVars
				.split('\n')
				.map(row => _.trimStart(row))
				.filter(row => !!row)
				.forEach(row => {
					// Environment variables cannot have = in their names, so we are safe with non-greedy regex.
					// Do not trim at the end as variable values may have space(s) at the end.
					let match = _.trimStart(row).match(envVarsRegExp);

					if (match) {
						environmentVariables[match[1].trim()] = match[2];
					} else {
						console.log(row + " does not match regex.");
					}
				});

			return addEtcPathToPath(environmentVariables);
		}
	} catch (err) {
		console.error(err.message);
	}

	return addEtcPathToPath(process.env);
};

module.exports = {
	getEnvironmentVariables: getEnvironmentVariables
};
