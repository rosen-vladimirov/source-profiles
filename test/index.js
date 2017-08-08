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
	const consoleLog = console.log;
	const consoleError = console.error;
	const shellEnvVar = process.env.SHELL;

	const defaultExpectedVariables = {
		"VAR1": "1",
		"VAR2": "2",
		"VAR4": "1=2=3=4",
		"VAR5": "   1 2   3 ",
		"VAR6": "1 2 3"
	};

	beforeEach(() => {
		processWrapper.getProcessPlatform = () => "tests";
	});

	afterEach(() => {
		processWrapper.getProcessPlatform = originalGetProcessPlatform;
		fs.readFileSync = readFileSync;
		fs.existsSync = existsSync;
		childProcess.execSync = execSync;
		console.log = consoleLog;
		console.error = consoleError;
		process.env.SHELL = shellEnvVar;
	});

	const testCustomConfigurations = ({ usingNodejs }) => {

		const customShell = "myShell";

		const customConfigScenarios = [
			{
				userConfig: {
					shell: customShell
				},
				expectedOutputs: {
					linux: `"${customShell}" -ic`,
					darwin: `"${customShell}" -ilc`
				}
			},

			{
				userConfig: {
					terminalConfiguration: {
						isLogin: true,
						isInteractive: false
					}
				},
				expectedOutputs: {
					linux: `"/bin/bash" -lc`,
					darwin: `"/bin/bash" -lc`
				}
			},

			{
				userConfig: {
					shell: customShell,
					terminalConfiguration: {
						isLogin: true
					}
				},
				expectedOutputs: {
					linux: `"${customShell}" -ilc`,
					darwin: `"${customShell}" -ilc`
				}
			},

			{
				userConfig: {
					shell: customShell,
					terminalConfiguration: {
						isLogin: false
					}
				},
				expectedOutputs: {
					linux: `"${customShell}" -ic`,
					darwin: `"${customShell}" -ic`
				}
			},

			{
				userConfig: {
					shell: customShell,
					terminalConfiguration: {
						isInteractive: true
					}
				},
				expectedOutputs: {
					linux: `"${customShell}" -ic`,
					darwin: `"${customShell}" -ilc`
				}
			},

			{
				userConfig: {
					shell: customShell,
					terminalConfiguration: {
						isInteractive: false
					}
				},
				expectedOutputs: {
					linux: `"${customShell}" -c`,
					darwin: `"${customShell}" -lc`
				}
			},

			{
				userConfig: {
					shell: customShell,
					terminalConfiguration: {
						isLogin: true,
						isInteractive: true
					}
				},
				expectedOutputs: {
					linux: `"${customShell}" -ilc`,
					darwin: `"${customShell}" -ilc`
				}
			},

			{
				userConfig: {
					shell: customShell,
					terminalConfiguration: {
						isLogin: true,
						isInteractive: false
					}
				},
				expectedOutputs: {
					linux: `"${customShell}" -lc`,
					darwin: `"${customShell}" -lc`
				}
			},

			{
				userConfig: {
					shell: customShell,
					terminalConfiguration: {
						isLogin: false,
						isInteractive: true
					}
				},
				expectedOutputs: {
					linux: `"${customShell}" -ic`,
					darwin: `"${customShell}" -ic`
				}
			},

			{
				userConfig: {
					shell: customShell,
					terminalConfiguration: {
						isLogin: false,
						isInteractive: false
					}
				},
				expectedOutputs: {
					linux: `"${customShell}" -c`,
					darwin: `"${customShell}" -c`
				}
			}
		];

		const platforms = ["linux", "darwin"];

		_.each(platforms, platform => {

			_.each(customConfigScenarios, (testCase, testCaseIndex) => {

				it(`when ${usingNodejs ? "using Node.js" : "using env"} on ${platform} respects custom configuration, test case ${testCaseIndex}`, () => {
					processWrapper.getProcessPlatform = () => platform;
					process.env.SHELL = "";
					fs.existsSync = (filePath) => filePath !== etcPaths;

					const execSyncCommands = [];
					childProcess.execSync = (command) => {
						execSyncCommands.push(command);
						if (usingNodejs) {
							if (command.indexOf("node") !== -1) {
								return "";
							}

							throw new Error("You shouldn't get here!");
						} else {
							if (command.indexOf("node") !== -1) {
								throw new Error("Node.js fails");
							}

							return _.map(defaultExpectedVariables, (value, key) => `${key}=${value}`).join('\n');
						}
					};

					fs.readFileSync = (filePath, encoding) => JSON.stringify(defaultExpectedVariables);

					// Modify console.log, in order to hide message for missing Node.js
					console.log = () => undefined;
					const actualResult = index.getEnvironmentVariables(testCase.userConfig);
					const executedCommandsLength = usingNodejs ? 1 : 2;

					// Get back the original console.log, so mocha can print information for current test.
					console.log = consoleLog;
					assert.equal(execSyncCommands.length, executedCommandsLength);

					_.each(execSyncCommands, command => {
						assert.isTrue(_.startsWith(command, testCase.expectedOutputs[platform]), `The expected string is: ${testCase.expectedOutputs[platform]}, but received ${execSyncCommands[0]}.`);
					});

					assert.deepEqual(actualResult, defaultExpectedVariables);

				});

			});

		});
	};

	describe(`uses ${etcPaths}`, () => {
		it("when there's PATH variable in it", () => {
			fs.existsSync = (filePath) => filePath === etcPaths;
			fs.readFileSync = (filePath, encoding) => 'path1\npath2\npath3';

			const expectedVariables = _.merge({}, defaultExpectedVariables, { PATH: "path0" });

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

	describe("when Node.js is used", () => {
		it("prints warning that cannot get environment variables via node when spawn of child process with node arg fails", () => {
			fs.existsSync = (filePath) => filePath !== etcPaths;

			const execSyncCommands = [];
			childProcess.execSync = (command) => {
				execSyncCommands.push(command);
				if (command.indexOf("node") !== -1) {
					throw new Error("Unable to find node");
				}

				return _.map(defaultExpectedVariables, (value, key) => `${key}=${value}`).join('\n');
			};

			let loggedWarnings = [];

			console.log = (data) => {
				loggedWarnings.push(data);
			};

			const actualResult = index.getEnvironmentVariables();

			assert.deepEqual(loggedWarnings.length, 1);
			assert.isTrue(loggedWarnings[0].indexOf("node") !== -1);
			assert.deepEqual(actualResult, defaultExpectedVariables);
		});

		it("gets the process env written in a file by executed node process", () => {
			fs.existsSync = (filePath) => filePath !== etcPaths;

			const execSyncCommands = [];
			childProcess.execSync = (command) => {
				execSyncCommands.push(command);
				if (command.indexOf("node") !== -1) {
					return "";
				}

				throw new Error("You shouldn't get here!");
			};

			fs.readFileSync = (filePath, encoding) => JSON.stringify(defaultExpectedVariables);

			const actualResult = index.getEnvironmentVariables();
			assert.deepEqual(actualResult, defaultExpectedVariables);
		});

		testCustomConfigurations({ usingNodejs: true });
	});

	describe("when env is used", () => {
		it("returns correct variables", () => {
			fs.existsSync = (filePath) => filePath !== etcPaths;

			childProcess.execSync = (command) => {
				return _.map(defaultExpectedVariables, (value, key) => `${key}=${value}`).join('\n');
			};

			const actualResult = index.getEnvironmentVariables();
			assert.deepEqual(actualResult, defaultExpectedVariables);
		});

		it("prints warning when environment variable does not match expected format", () => {
			fs.existsSync = (filePath) => filePath !== etcPaths;

			const expectedVariables = {
				"": "1"
			};

			childProcess.execSync = (command) => {
				return _.map(expectedVariables, (value, key) => `${key}=${value}`).join('\n');
			};

			let loggedWarnings = [];

			console.log = (data) => {
				loggedWarnings.push(data);
			};

			const actualResult = index.getEnvironmentVariables();

			assert.deepEqual(loggedWarnings.length, 2);
			assert.isTrue(loggedWarnings[0].indexOf("Unable to get environment variables from node") !== -1);

			assert.isTrue(loggedWarnings[1].indexOf("does not match") !== -1);
		});

		it("returns process.env on windows", () => {
			fs.existsSync = (filePath) => true;

			const expectedVariables = {
				"VAR1": "1"
			};

			childProcess.execSync = (command) => {
				return _.map(expectedVariables, (value, key) => `${key}=${value}`).join('\n');
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
				fs.existsSync = (filePath) => filePath !== etcPaths;

				childProcess.execSync = (command) => value;

				const actualResult = index.getEnvironmentVariables();
				assert.deepEqual(actualResult, process.env);
			});
		});

		it(`returns process.env when child process throws`, () => {
			fs.existsSync = (filePath) => filePath !== etcPaths;

			const message = "execSyncThrows";
			childProcess.execSync = (command) => {
				throw new Error(message);
			};

			let loggedErrors = [];
			console.error = (data) => {
				loggedErrors.push(data);
			};

			const actualResult = index.getEnvironmentVariables();

			assert.deepEqual(actualResult, process.env);

			assert.deepEqual(loggedErrors.length, 1);

			assert.deepEqual(loggedErrors[0], message);
		});

		const verifySourceCommand = (shellEnv) => {
			process.env.SHELL = shellEnv;

			fs.existsSync = (filePath) => false;

			const expectedVariables = {
				"VAR1": "1"
			};

			let passedCommandArgument;

			childProcess.execSync = (command) => {
				passedCommandArgument = command;

				return _.map(expectedVariables, (value, key) => `${key}=${value}`).join('\n');
			};

			const actualResult = index.getEnvironmentVariables();

			assert.deepEqual(actualResult, expectedVariables);

			assert.isTrue(passedCommandArgument.indexOf(shellEnv) !== -1);
		};

		it("works when iTerm shell integration is enabled", () => {
			const str = Buffer.from(`Now using node v7.6.0 (npm v5.0.0)
\u001b]1337;RemoteHost=username@machinename\u0007\u001b]1337;CurrentDir=/Users/username/Work/get-shell-vars\u0007\u001b]1337;ShellIntegrationVersion=5;shell=bash\u0007MANPATH=/Users/username/.nvm/versions/node/v7.6.0/share/man:/usr/share/man:/usr/local/share/man:/Applications/Xcode.app/Contents/Developer/usr/share/man:/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/share/man
TERM_PROGRAM=Apple_Terminal`);

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

		testCustomConfigurations({ usingNodejs: false });
	});

});
