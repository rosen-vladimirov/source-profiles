"use strict";

const _ = require("lodash"),
	assert = require("chai").assert;

let fs = require("fs");
let childProcess = require("child_process");
let processWrapper = require("../lib/process-wrapper");
const originalGetProcessPlatform = processWrapper.getProcessPlatform;
const index = require("../lib/index");
const etcPaths = "/etc/paths";

describe("getEnvironmentVariables", () => {
	const readFileSync = fs.readFileSync;
	const existsSync = fs.existsSync;
	const execSync = childProcess.execSync;

	beforeEach(() => {
		processWrapper.getProcessPlatform = () => "tests";
	});

	afterEach(() => {
		processWrapper.getProcessPlatform = originalGetProcessPlatform;
		fs.readFileSync = readFileSync;
		fs.existsSync = existsSync;
		childProcess.execSync = execSync;
	});

	describe(`uses ${etcPaths}`, () => {
		it("when there's PATH variable in it", () => {
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
		fs.existsSync = (filePath) => {
			return filePath !== etcPaths;
		};

		const expectedVariables = {
			"": "1"
		};

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

		assert.deepEqual(loggedWarnings.length, 1);

		assert.isTrue(loggedWarnings[0].indexOf("does not match") !== -1);
	});

	it("returns process.env on windows", () => {
		fs.existsSync = (filePath) => true;

		const expectedVariables = {
			"VAR1": "1"
		};

		childProcess.execSync = (command) => {
			return _.map(expectedVariables, (value, key) => {
				return `${key}=${value}`;
			}).join('\n');
		};

		processWrapper.getProcessPlatform = () => "win32";

		const actualResult = index.getEnvironmentVariables();
		assert.deepEqual(actualResult, process.env);
	});

	const emptyTestData = [
		null,
		undefined,
		''
	];

	_.each(emptyTestData, value => {
		it(`returns process.env when child process does not return any data (${value})`, () => {
			fs.existsSync = (filePath) => {
				return filePath !== etcPaths;
			};

			childProcess.execSync = (command) => value;

			const actualResult = index.getEnvironmentVariables();
			assert.deepEqual(actualResult, process.env);
		});
	});

	it(`returns process.env when child process throws`, () => {
		fs.existsSync = (filePath) => {
			return filePath !== etcPaths;
		};

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

		assert.deepEqual(actualResult, process.env);

		assert.deepEqual(loggedErrors.length, 1);

		assert.deepEqual(loggedErrors[0], message);
	});

	const verifySourceCommand = (shellEnv) => {
		const originalShellEnv = process.env.SHELL;
		process.env.SHELL = shellEnv;

		fs.existsSync = (filePath) => false;

		const expectedVariables = {
			"VAR1": "1"
		};

		let passedCommandArgument;

		childProcess.execSync = (command) => {
			passedCommandArgument = command;

			return _.map(expectedVariables, (value, key) => {
				return `${key}=${value}`;
			}).join('\n');
		};

		const actualResult = index.getEnvironmentVariables();

		process.env.SHELL = originalShellEnv;

		assert.deepEqual(actualResult, expectedVariables);

		assert.isTrue(passedCommandArgument.indexOf(shellEnv) !== -1);
	};

	it("works when iTerm shell integration is enabled", () => {
		const str = Buffer.from(`Now using node v7.6.0 (npm v5.0.0)
\u001b]1337;RemoteHost=username@machinename\u0007\u001b]1337;CurrentDir=/Users/username/Work/get-shell-vars\u0007\u001b]1337;ShellIntegrationVersion=5;shell=bash\u0007MANPATH=/Users/username/.nvm/versions/node/v7.6.0/share/man:/usr/share/man:/usr/local/share/man:/Applications/Xcode.app/Contents/Developer/usr/share/man:/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/share/man
TERM_PROGRAM=Apple_Terminal`);
		const originalShellEnv = process.env.SHELL;
		process.env.SHELL = ".bash_profile";
		fs.existsSync = (filePath) => filePath === etcPaths;
		fs.readFileSync = (filePath, encoding) => 'path1\npath2\npath3';

		const expectedVariables = {
			"MANPATH": "/Users/username/.nvm/versions/node/v7.6.0/share/man:/usr/share/man:/usr/local/share/man:/Applications/Xcode.app/Contents/Developer/usr/share/man:/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/share/man",
			"TERM_PROGRAM": "Apple_Terminal",
			"PATH": "path1:path2:path3"
		};

		let passedCommandArgument;

		childProcess.execSync = (command) => {
			passedCommandArgument = command;

			return str;
		};

		const actualResult = index.getEnvironmentVariables();
		process.env.SHELL = originalShellEnv;
		assert.deepEqual(actualResult, expectedVariables);
	});

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
