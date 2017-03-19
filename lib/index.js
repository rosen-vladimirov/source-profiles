"use strict";

const fs = require("fs"),
	childProcess = require("child_process"),
	path = require("path"),
	_ = require("lodash"),
	processWrapper = require("./process-wrapper");

// Correct order for Login shells is described here:
// http://hayne.net/MacDev/Notes/unixFAQ.html#shellStartup
const profileOrder = [
	".bash_profile",
	".bash_login",
	".profile",
	".bashrc"
];

const envVarsRegExp = /^(.+?)=(.*?$)/;

const getPathsToProfiles = (shell) => {
	let currentProfileOrder = profileOrder.map(p => p.replace("bash", shell)) // in case the default shell is not bash
		.map(p => path.join(process.env.HOME, p));

	return currentProfileOrder.filter(profileName => fs.existsSync(profileName))
};

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

const getEnvironmentsFromProfile = (command) => {
	try {
		const sourcedEnvironmentVars = childProcess.execSync(command);

		if (sourcedEnvironmentVars) {
			let environmentVariables = {};

			sourcedEnvironmentVars
				.toString()
				.split('\n')
				.filter(row => !!row)
				.forEach(row => {
					// Environment variables cannot have = in their names, so we are safe with non-greedy regex.
					// Do not trim at the end as variable values may have space(s) at the end.
					let match = _.trimStart(row).match(envVarsRegExp);

					if (match) {
						environmentVariables[match[1].trim()] = match[2];
					} else {
						console.log(`During parsing result of ${command}, the line: '${row}' does not match regex for env vars: ${envVarsRegExp}.`);
					}
				});

			return environmentVariables;
		}
	} catch (err) {
		console.error(err.message);
	}

	return null;
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
		pathToShell = process.env && process.env.SHELL || "/bin/bash",
		pathsToProfiles = getPathsToProfiles(shell),
		// Separate commands with `;` instead of && - this way even if `source` command fails for some reason, we'll still parse the result of `env` command.
		commandsToExecute = _.map(pathsToProfiles, pathToProfileFile => `${pathToShell} -c "source ${pathToProfileFile}; env"`);

	commandsToExecute.push(`${pathToShell} -ilc env`);

	let environmentVariables = _.cloneDeep(process.env);
	_.each(commandsToExecute, command => {
		const currentEnv = getEnvironmentsFromProfile(command);
		if (currentEnv) {
			_.merge(environmentVariables, currentEnv);
		}
	});

	return addEtcPathToPath(environmentVariables);
};

module.exports = {
	getEnvironmentVariables: getEnvironmentVariables
};
