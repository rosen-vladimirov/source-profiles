/**
 * Defines the user specific configuration of the shell and terminal.
 */
interface IUserConfiguration {
    /**
     * Path to the shell that should be used.
     * @example "/bin/sh"
     * By default this value is taken from SHELL environment variable and in case it is not set, "/bin/bash" is used.
     */
    shell?: string;

    /**
     * Describes the configuration of the terminal that the user would like to have.
     * These settings modify the behavior, i.e. which profile files of the respective shell will be loaded.
     */
    terminalConfiguration?: {
        /**
         * Defines if the terminal is interactive or no.
         * `true` by default.
         */
        isInteractive?: boolean;

        /**
         * Defines if login session will be started.
         * `false` by default on Linux.
         * `true` on all other OSes.
         */
        isLogin?: boolean;
    }
}

interface IStringDicitionary {
    [key: string]: string;
}

declare module "get-shell-vars" {
    /**
     * Gets a JSON object with all environment variables.
     * @param {IUserConfiguration} userConfiguration Optional argument that can be used to modify the settings of the shell session that will be started to get environment variables.
     * @returns {IStringDicitionary} JSON object with key-value pairs that are all environment variables.
     */
    function getEnvironmentVariables(userConfiguration?: IUserConfiguration): IStringDicitionary;
}