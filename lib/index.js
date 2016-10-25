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

const getPathToProfile = (shell) => {
	let currentProfileOrder = profileOrder.map(p => p.replace("bash", shell)) //in case the default shell is not bash
		.map(p => path.join(process.env.HOME, p));

	for (let profileName of currentProfileOrder) {
		if (fs.existsSync(profileName)) {
			return profileName;
		}
	}
};

const getEnvironmentVariables = () => {
	if (processWrapper.getProcessPlatform() === "win32") {
		return process.env;
	}

	const shell = process.env && process.env.SHELL && path.basename(process.env.SHELL) || "bash",
		pathToShell = process.env && process.env.SHELL  || "/bin/bash";

	const profileName = getPathToProfile(shell);

	if (!profileName) {
		return process.env;
	}

	try {
		const sourcedEnvironmentVars = childProcess.execSync(`${pathToShell} -c "source ${profileName} && env"`);

		if (sourcedEnvironmentVars) {
			let environmentVariables = {};

			const envVarsRegExp = /^(.+?)=(.*?$)/;
			sourcedEnvironmentVars.toString().split('\n').forEach(row => {
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
	} catch(err) {
		console.error(err.message);
	}

	return process.env;
};

module.exports = {
	getEnvironmentVariables: getEnvironmentVariables
};
