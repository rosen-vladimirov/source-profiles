# get-shell-vars
Code that sources correct profiles, so that you can use all Environment variables declared in them.

### Usage
1. First install the package:
```
npm install --save get-shell-vars
```

2. Now use it in your code:
```
let shellVars = require("get-shell-vars");
shellVars.getEnvironmentVariables();
```

The result is an object with all environment variables.

### System requirements

The package requires Node.js 4.0.0 or later as it uses let, const, lambdas, etc.
