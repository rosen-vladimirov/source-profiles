"use strict";

const _ = require("lodash"),
	assert = require("chai").assert;

describe("getEnvironmentVariables", () => {

	it("returns correct variables", () => {
		let fs = require("fs");
		// Mock just to prevent multiple file system calls.
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
		// Mock just to prevent multiple file system calls.
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

	it("when default shell is not set, uses bash", () => {
		let shell = process.env.SHELL;
		process.env.SHELL = '';

		const profileName = ".bash_profile";
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

		process.env.SHELL = shell;

		assert.deepEqual(actualResult, expectedVariables);

		assert.isTrue(passedCommandArgument.indexOf(profileName) !== -1);
	});
});
