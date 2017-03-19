"use strict";

const assert = require("chai").assert;

describe("process-wrapper", () => {
	describe("getProcessPlatform", () => {
		it("returns process.platform", () => {
			const actualResult = require("../lib/process-wrapper").getProcessPlatform();
			assert.deepEqual(actualResult, process.platform);
		});
	});

	describe("getEnv", () => {
		it("returns process.env", () => {
			const actualResult = require("../lib/process-wrapper").getEnv();
			assert.deepEqual(actualResult, process.env);
		});
	});

});
