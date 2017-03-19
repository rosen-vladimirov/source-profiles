"use strict";

const getProcessPlatform = () => process.platform;
const getEnv = () => process.env;

module.exports = {
	getProcessPlatform: getProcessPlatform,
	getEnv: getEnv
};
