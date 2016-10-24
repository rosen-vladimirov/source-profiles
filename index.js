 // TODO: any of the dotted files might not exist
// List all dotted files from the home dir and source them maybe?
// http://hayne.net/MacDev/Notes/unixFAQ.html#shellStartup
// Correct order for Login shells is:
"use strict";

const fs = require("fs"),
	childProcess = require("child_process"),
	path = require("path");

const profileOrder = [
	".bash_profile",
	".bash_login",
	".profile",
	".bashrc"
];

let getPathToProfile = (shell) => {
	let currentProfileOrder = profileOrder.map(p => path.join("~", p.replace("bash", shell)));

	for(let profileName of currentProfileOrder) {
		if (fs.existsSync(profileName)) {
			return profileName;
		}
	}
};

let getEnironmentVariables = () => {
	let profileName = getPathToProfile(process.env.SHELL || "bash");

	let bashEnv = childProcess.execSync(`source ${profileName} && env`).toString();

	let bashVars = {};

	bashEnv.split('\n').forEach(r => {
		// Environment variables cannot have = in their names, so we are safe with non-greedy regex.
		// Do not trim at the end as variable values may have space(s) at the end.
		let match = r.trimStart().match(/^(.*?)=(.*?)$/);
		if (match) {
			bashVars[match[1]] = match[2];
		} else {
			console.log(r + " does not match regex");
		}
	});

	return bashVars;
}

module.exports = {
	getEnironmentVariables: getEnironmentVariables
}