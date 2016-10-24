"use strict";

const _ = require("lodash"),
	assert = require("chai").assert;

describe("getEnvironmentVariables", () => {

	it("returns correct variables", () => {
		let fs = require("fs");
		fs.existsSync = (filePath) => true;

		const expectedVariables = {
			"VAR1": "1",
			"VAR2": "2",
			"VAR4": "1=2=3=4",
			"VAR5": "   1 2   3 ",
			"VAR6": "1 2 3"
		};

		let childProcess = require("child_process");
		childProcess.execSync = (command) => {
			return _.map(expectedVariables, (value, key) => {
				return `${key}=${value}`;
			}).join('\n');
		};

		const actualResult = require("../index").getEnvironmentVariables();
		assert.deepEqual(actualResult, expectedVariables);
	});

	it("prints warning when environment variable does not match expected format", () => {
		let fs = require("fs");
		fs.existsSync = (filePath) => true;

		const expectedVariables = {
			"": "1"
		};

		let childProcess = require("child_process");
		childProcess.execSync = (command) => {
			return _.map(expectedVariables, (value, key) => {
				return `${key}=${value}`;
			}).join('\n');
		};

		let loggedWarnings = [];

		const originalConsoleLog = console.log;
		console.log = (data) => {
			loggedWarnings.push(data);
		};

		const actualResult = require("../index").getEnvironmentVariables();

		console.log = originalConsoleLog;

		assert.deepEqual(loggedWarnings.length, 1);

		assert.isTrue(loggedWarnings[0].indexOf("does not match") !== -1);
	});

	it("returns process.env when none of the profiles exists", () => {
		let fs = require("fs");
		fs.existsSync = (filePath) => false;

		const actualResult = require("../index").getEnvironmentVariables();
		assert.deepEqual(actualResult, process.env);
	});

	const emptyTestData = [
		null,
		undefined,
		''
	];

	_.each(emptyTestData, value => {
		it(`returns process.env when child process does not return any data (${value})`, () => {
			let fs = require("fs");
			fs.existsSync = (filePath) => true;

			let childProcess = require("child_process");
			childProcess.execSync = (command) => value;

			const actualResult = require("../index").getEnvironmentVariables();
			assert.deepEqual(actualResult, process.env);
		});
	});

	it(`returns process.env when child process throws`, () => {
		let fs = require("fs");
		fs.existsSync = (filePath) => true;

		let childProcess = require("child_process");
		const message = "execSyncThrows";
		childProcess.execSync = (command) => {
			throw new Error(message);
		};

		const originalConsoleErr = console.error;
		let loggedErrors = [];
		console.error = (data) => {
			loggedErrors.push(data);
		};

		const actualResult = require("../index").getEnvironmentVariables();

		console.error = originalConsoleErr;

		assert.deepEqual(actualResult, process.env);

		assert.deepEqual(loggedErrors.length, 1);

		assert.deepEqual(loggedErrors[0], message);
	});

	describe("uses correct order of profiles", () => {
		const profileOrder = [
			".bash_profile",
			".bash_login",
			".profile",
			".bashrc"
		];

		_.each(profileOrder, profileName => {
			it(`when ${profileName} exists it's used`, () => {
				let fs = require("fs");
				fs.existsSync = (filePath) => {
					return _.endsWith(filePath, profileName);
				};

				const expectedVariables = {
					"VAR1": "1"
				};

				let passedCommandArgument;

				let childProcess = require("child_process");

				childProcess.execSync = (command) => {
					passedCommandArgument = command;
					return _.map(expectedVariables, (value, key) => {
						return `${key}=${value}`;
					}).join('\n');
				};

				const actualResult = require("../index").getEnvironmentVariables();

				assert.deepEqual(actualResult, expectedVariables);

				assert.isTrue(passedCommandArgument.indexOf(profileName) !== -1);
			});

		});
	});

	const verifySourceCommand = (profileName, shellEnv) => {
		let originalShellEnv = process.env.SHELL;
		process.env.SHELL = shellEnv;

		let fs = require("fs");
		fs.existsSync = (filePath) => {
			return _.endsWith(filePath, profileName);
		};

		const expectedVariables = {
			"VAR1": "1"
		};

		let passedCommandArgument;

		let childProcess = require("child_process");

		childProcess.execSync = (command) => {
			passedCommandArgument = command;

			return _.map(expectedVariables, (value, key) => {
				return `${key}=${value}`;
			}).join('\n');
		};

		const actualResult = require("../index").getEnvironmentVariables();

		process.env.SHELL = originalShellEnv;

		assert.deepEqual(actualResult, expectedVariables);

		assert.isTrue(passedCommandArgument.indexOf(profileName) !== -1);
		assert.isTrue(passedCommandArgument.indexOf(shellEnv) !== -1);
	};

	it("when default shell is not set, uses bash", () => {
		verifySourceCommand(".bash_profile", '');
	});

	it("uses custom shell, when bash is not default", () => {
		verifySourceCommand(".zshrc", "/bin/zsh");
	});

	it("uses custom shell, when bash is not default and default shell is not full path", () => {
		verifySourceCommand(".zshrc", "zsh");
	});
});
