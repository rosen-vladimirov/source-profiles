"use strict";

const fs = require("fs"),
	childProcess = require("child_process"),
	path = require("path"),
	_ = require("lodash"),
	processWrapper = require("./process-wrapper"),
	temp = require("temp");

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

const getEnvironmentVariablesFromNodeProcess = (shellStringForExecution) => {
	try {
		temp.track();
		const pathToTempFile = temp.path("get-shell-vars-process-env");

		const shellCommandSpawningNode = `${shellStringForExecution} "node -e 'require(\\"fs\\").writeFileSync(\\"${pathToTempFile}\\", JSON.stringify(process.env))'"`;
		childProcess.execSync(shellCommandSpawningNode);
		const env = JSON.parse(fs.readFileSync(pathToTempFile));
		return env;
	} catch (err) {
		console.log("Unable to get environment variables from node, will try another approach.");
	}
};

const getEnvironmentVariablesFromEnvCommand = (shellStringForExecution) => {
	try {
		let sourcedEnvironmentVars = childProcess.execSync(`${shellStringForExecution} env`);

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

			return environmentVariables;
		}
	} catch (err) {
		console.error(err.message);
	}
};

const getDefaultConfigurationForOS = (platform) => {
	const shell = process.env && process.env.SHELL || "/bin/bash";
	const isInteractive = true;
	const isLogin = platform !== "linux";

	return {
		shell,
		terminalConfiguration: {
			isInteractive,
			isLogin
		}
	};
};

const getShellStringForExecution = (shellConfig) => {
	const pathToShell = shellConfig.shell;
	const interactiveFlag = shellConfig.terminalConfiguration.isInteractive ? "i" : "";
	const loginFlag = shellConfig.terminalConfiguration.isLogin ? "l" : "";

	const shellStringForExecution = `"${pathToShell}" -${interactiveFlag}${loginFlag}c`;
	return shellStringForExecution;
};

/**
 * Gets all environment variables that the user has in the default terminal.
 * @param {object} userConfiguration Specific config for the shell and terminal used.
 * @returns {object} Dictionary with key-value pairs of all environment variables.
 */
const getEnvironmentVariables = (userConfiguration) => {
	const platform = processWrapper.getProcessPlatform();

	if (platform === "win32") {
		return process.env;
	}

	const defaultConfiguration = getDefaultConfigurationForOS(platform);

	const shellConfig = _.merge({}, defaultConfiguration, userConfiguration);
	const shellStringForExecution = getShellStringForExecution(shellConfig);

	const environmentVariables = getEnvironmentVariablesFromNodeProcess(shellStringForExecution) || getEnvironmentVariablesFromEnvCommand(shellStringForExecution) || process.env;
	return addEtcPathToPath(environmentVariables);
};

module.exports = {
	getEnvironmentVariables: getEnvironmentVariables
};
