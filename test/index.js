"use strict";

const _ = require("lodash"),
	assert = require("chai").assert;

let fs = require("fs");
let childProcess = require("child_process");
let processWrapper = require("../lib/process-wrapper");
const originalGetProcessPlatform = processWrapper.getProcessPlatform;
const originalGetEnv = processWrapper.getEnv;
const index = require("../lib/index");
const etcPaths = "/etc/paths";

describe("getEnvironmentVariables", () => {
	const readFileSync = fs.readFileSync;
	const exists = fs.exists;
	const execSync = childProcess.execSync;

	beforeEach(() => {
		processWrapper.getProcessPlatform = () => "tests";
		processWrapper.getEnv = () => ({});
	});

	after(() => {
		processWrapper.getProcessPlatform = originalGetProcessPlatform;
		processWrapper.getEnv = originalGetEnv;
		fs.readFileSync = readFileSync;
		fs.exists = exists;
		childProcess.execSync = execSync;
	});

	describe(`uses ${etcPaths}`, () => {
		it("when there's PATH variable in it", () => {
			let fs = require("fs");
			fs.existsSync = (filePath) => filePath === etcPaths;
			fs.readFileSync = (filePath, encoding) => 'path1\npath2\npath3';

			const expectedVariables = {
				"VAR1": "1",
				"VAR2": "2",
				"VAR4": "1=2=3=4",
				"VAR5": "   1 2   3 ",
				"VAR6": "1 2 3",
				"PATH": "path0"
			};

			let childProcess = require("child_process");
			childProcess.execSync = (command) => {
				return _.map(expectedVariables, (value, key) => {
					return `${key}=${value}`;
				}).join('\n');
			};

			const actualResult = index.getEnvironmentVariables();

			expectedVariables.PATH = "path0:path1:path2:path3";
			assert.deepEqual(actualResult, expectedVariables);
		});
	});

	it("returns correct variables", () => {
		let fs = require("fs");
		fs.existsSync = (filePath) => {
			return filePath !== etcPaths;
		};

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

		const actualResult = index.getEnvironmentVariables();
		assert.deepEqual(actualResult, expectedVariables);
	});

	it("prints warning when environment variable does not match expected format", () => {
		let fs = require("fs");
		fs.existsSync = (filePath) => {
			return filePath !== etcPaths;
		};

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

		const actualResult = index.getEnvironmentVariables();

		console.log = originalConsoleLog;

		assert.deepEqual(loggedWarnings.length, 5);

		assert.isTrue(loggedWarnings[0].indexOf("does not match") !== -1);
	});

	it("returns process.env on windows", () => {
		let fs = require("fs");
		fs.existsSync = (filePath) => true;

		const expectedVariables = {
			"VAR1": "1"
		};

		let childProcess = require("child_process");
		childProcess.execSync = (command) => {
			return _.map(expectedVariables, (value, key) => {
				return `${key}=${value}`;
			}).join('\n');
		};

		processWrapper.getProcessPlatform = () => "win32";

		const actualResult = index.getEnvironmentVariables();
		assert.deepEqual(actualResult, processWrapper.getEnv());
	});

	const emptyTestData = [
		null,
		undefined,
		''
	];

	_.each(emptyTestData, value => {
		it(`returns process.env when child process does not return any data (${value})`, () => {
			let fs = require("fs");
			fs.existsSync = (filePath) => {
				return filePath !== etcPaths;
			};

			let childProcess = require("child_process");
			childProcess.execSync = (command) => value;

			const actualResult = index.getEnvironmentVariables();
			assert.deepEqual(actualResult, processWrapper.getEnv());
		});
	});

	it(`returns process.env when child process throws`, () => {
		let fs = require("fs");
		fs.existsSync = (filePath) => {
			return filePath !== etcPaths;
		};

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

		const actualResult = index.getEnvironmentVariables();

		console.error = originalConsoleErr;

		assert.deepEqual(actualResult, processWrapper.getEnv());

		assert.deepEqual(loggedErrors.length, 5);

		assert.deepEqual(loggedErrors[0], message);
	});

	const verifySourceCommand = (shellEnv) => {
		processWrapper.getEnv = () => ({ SHELL: shellEnv });

		const expectedVariables = {
			SHELL: shellEnv,
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

		const actualResult = index.getEnvironmentVariables();

		assert.deepEqual(actualResult, expectedVariables);
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
