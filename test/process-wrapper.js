"use strict";

const assert = require("chai").assert;

describe("getProcessPlatform", () => {
	it("returns process.platform", () => {
		const actualResult = require("../lib/process-wrapper").getProcessPlatform();
		assert.deepEqual(process.platform, actualResult);
	});
});