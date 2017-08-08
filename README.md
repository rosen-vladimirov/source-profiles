# get-shell-vars
Code that sources correct profiles, so that you can use all Environment variables declared in them.

## Usage
### Using the default settings for current OS
In case you want to use the default settings for current OS, just call `getEnvironmentVariables` method without arguments.

1. First install the package:
```
npm install --save get-shell-vars
```

2. Now use it in your code:
```
const shellVars = require("get-shell-vars");
shellVars.getEnvironmentVariables();
```

The result is an object with all environment variables.

### Using custom shell and terminal settings
In many cases, you may need to use specific SHELL or custom terminal settings, you may pass an object to `getEnvironmentVariables` method and the module will respect them instead of the default ones.
The object has the following definition:
```TypeScript
/**
 * Defines the user specific configuration of the shell and terminal.
 */
interface IUserConfiguration {
    /**
     * Path to the shell that should be used.
     * @example "/bin/sh"
     * By default this value is taken from SHELL environment variable and in case it is not set, "/bin/bash" is used.
     */
    shell: string;

    /**
     * Describes the configuration of the terminal that the user would like to have.
     * These settings modify the behavior, i.e. which profile files of the respective shell will be loaded.
     */
    terminalConfiguration: {
        /**
         * Defines if the terminal is interactive or no.
         * `true` by default.
         */
        isInteractive: boolean;

        /**
         * Defines if login session will be started.
         * `false` by default on Linux.
         * `true` on all other OSes.
         */
        isLogin: boolean;
    }
}
```

You can pass only the properties that you want to modify. For example:
```JavaScript
const shellVars = require("get-shell-vars");
const userConfiguration = {
    terminalConfiguration: {
        isLogin: true
    }
};

shellVars.getEnvironmentVariables(userConfiguration);
```

## OS specific information
The module will use different shell settings on each OS.

### Windows
The module will always return the value of `process.env`.

### Linux
The module will spawn a new interactive, **non-login** shell. The shell is taken from `SHELL` environment variable.

### macOS
The module will spawn a new interactive, **login** shell. The shell is taken from `SHELL` environment variable.


## System requirements

The package requires Node.js 6.0.0 or later.
