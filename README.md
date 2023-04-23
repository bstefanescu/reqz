# Reqz

Request Automation for REST APIs. Useful to test / debug REST APIs.

**Installation**: `npm -g install reqz`

**Requirements**: ES2020 `( >= node 14.5.0)`

The application is executing requests described using `reqz` request files.

## Usage

`reqz [options] <file>`

**Arguments:**
  - file:  the request file to run

**Options:**
```
  -q | --quiet                   Run quitely. Do not output enything.
  -a | --all                     Log all the request from the request chain not only the main one.
  -l | --log <string>            Log settings. A list separated by commas. Can be any combination of: "req,reqh,reqb,resh,resb".
  -p | --play <string>           Takes a csv file as value. Play the same request for each set of variables created for each line from the csv file. The csv header is expected to specify the variable names.
  -c | --col-delimiter <string>  A column delimiter in case --play was specified. The default is the comma character.
  -v, --version                  output the current version
  -h, --help                     display help for command
```

Any other option starting woith '--' that is not a built-in option will be added as a variable to the request environment:

`reqz ./get-user-by-email.req --email john@doe.com`

## Request file anatomy 

You can use any extension yout want for you request files. Like `.req`, `.rq`, `.reqz` etc.

### The minimal request

A minimal request file is a regular HTTP request composed from: 
- A HTTP request line: `GET https://my.server.com/path`
- One or more optional lines to specify the HTTP headers to send. The headers must not be separated by empty lines. 
- An optional body separated by an empty line from the request or request header lines. 


The supported HTTP methos are: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`, `HEAD`, `PATCH`, `TRACE` and `CONNECT`

**Examples:**

```
GET https://my.server.com/api/v1/users
```

```
GET https://my.server.com/api/v1/users
Accept: application/json
```

```
POST https://my.server.com/api/v1/users
Accept: application/json
Content-Type: application/json

{
    name: 'John Doe',
    email: 'johndoe@foobar.com',
}
```

The request URL and the header values support template literals as values (i.e. variable substitution). The template literals are not required to be surrounded by backticks characters. You can also use double quoted or single qouted strings as values. The request body accept any javascript expression. Like for example an object to post JSON data. 

Here is an example:

```
PUT https://my.server.com/api/v1/users/${userId}
Accept: application/json
Content-Type: application/json
Authorization: Bearer ${base64(username+':'+password)}

{
    name: name,
    email: email,
}
```

You can also POST a file content as a body. But in that case the file content will not be processed for variable substitution. To post a file use the soecial `@file` directive (which is only usable in the request body):

```
POST https://my.server.com/api/v1/users
Content-Type: application/octet-stream

@file 'path/to/some/content'
```

**Note** that the `@file` directive doesn't support variable substitution.

### Variables

Variables can be defined on the command line using `--varName 'varValue'` arguments or can be set in the request script file using the `@set` directive.
There are 2 type of variables:
1. required variables - the default one.
2. optional variables. When using JSON like expression to set the request query or body, if a variable is not defined then an 'undefined variable' error will be thrown. To avoid this and to ignore the undefined property you need to declare the variable as optional. 
This can be done using the `@var` directive by appending the '?' character to the variable name. The directive can be used to declare required variables  as well. Declaring required variables is optional but is recommended since IDE integration tools may use this information for generating autocompletion.

**Example**

```
@var userId, userEmail, firstName?, lastName?
@set apiUrl = 'https://my.server.com/api/v1'

PUT ${apiUrl}/users/${userId}

{
  userEmail,
  firstName,
  lastName
}
```

If you don't define the `userEmail` when running the above script then an error is thrown. But, the script will succeed if the `firstName` is not defined, since it is defined as optional. It will be simply ommited from the request body.

There are 3 builtin variable names, that you can use:
1. `$env` - the request environment - usefull to debug using `@inspect` directive
2. `$response` - the response object of the last executed request. See `@run` directive
3. `$play` - the current csv record when replaying requests using input from a csv file. See the `--play` flag.


### Expressions

There 2 types of expressions:
1. Literal values: "a double quoted string", 'a single quoted string', true, false, null, 123 (i.e. numbers), \``a template literal: Hello ${name}`\`.
2. Javascript expression. Any [ES2020](https://node.green/#ES2020) javascript expression is supported. 
3. String templates not surrounded with backticks. Example: `GET ${apiUrl}/users/${userId}`. These expression can be used in any directive that expects a string as its argument (if not explicitly stated in the directive doc. that it doesn't accept expressions).
Examples: requets URLs, request header values, `@include`, `@echo` etc.

Expressions are isloated and cannot access javascript globals. If you need to add your own functions to be acessed in expressions you can do so by using the `@import` directive.

The only built-in function available in the expressions scope is `base64`. This is usefull to generate basic authentication headers like:

```
Authorization: Basic ${base64(username+':'+password)}
```

### Comments

You can add comments by starting a line with the `#` character:

```
# List the existing users
GET https://my.server.com/api/v1/users
```

## Directives

Directives are special commands you can use inside a request file. To use a directive you should start the line (spaces are ignored) with the directive name which is prefixed with the `@` character.

Here is the list of all of the supported directives:

- @var
- @set
- @prompt
- @include
- @run
- @query
- @header
- @headers
- @echo
- @inspect
- @import
- @call
- @file


### @var

**Usage**: `@var userid, firstName?, lastName?`

Declare variable names used in the script file. Optional variables must be suffixed with an `?` character.
As indicated above variables declaration is optional. If you want to avoid `undefined variable` errors when using an optional variable then you must declare the variable as optional.

### @set

**Usage**: `@set variable = value`

Set a variable. The values can be any valid javascript expression (inlcuding literals like strings, numbers, booleans, null, backtick template expressions).

**Examples:**

```
@set apiUrl = "https://my.server.com/api/v1"
@set name = 'John Doe'
@set port = 8080
@set category = null
@set url = `https://${host}/${path}`
@set user = {
  firstName,
  lastName,
  role: 'reader'
}
@set fields = ['name', 'email']
@set secure = true
@set protocol = secure ? 'https' : 'http'
@set lowerCaseEmail = email.toLowerCase()
...
```

The `@set` directive can also be used to define a default value for a variable. This can be done using the `?=` assignement oeprator:

```
@set env ?= "dev"
```

In the example above the `env` variable is set to `"dev"` only if not yet defined.

### @prompt

**Usage:** `@prompt vairableName: Question`

The variableName must be a valid javascript variable name. The question part can be any valid string expression (it can be a string template).

```
@prompt email : "Your email? "
```

### @query

**Usage**: 

```
@query {
  userId,
  sort,
  verbose:true,
}
```

The query argument must be a javascript object.

Define the query string to be used by the current request. This can be handy to define the query as an object rather that to include it in the URL as an encoded query string. If both a query object and q query string is appended to the URL the two queries will be merged.


### @header

**Usage**: `@header Accept: application/json`

Set a single header for the current request. Usefull to define header presets in an included file.
The header value accept any valid string expression )inclusing string templates). The header name doesn't accept expressions.

**Example** 

```
@header Authorization: ${base64(username+':'+password)}
```

### @headers

**Usage**: 

```
@headers {
  Accept: "application/json"
  "Content-Type": "application/json"
}
```

Similar to `@header` but can set multiple header lines. The headers arguments must be a valid javascript object.


### @body

**Usage**: 

```
@body {
  email,
  firstName,
  lastName,
  role: "reader"
}
```

Define the body of the current request. The body argument must be a valid javascript object.

This can be handy to define body templates in an included file.

If the request is also defining a body this will overwrite the body defined using the `@body` directive.


### @include

**Usage:** `@include path/to/file.req`

The file argument can be any valid string expression (including string templates)

**Examples:** 
```
@include ${baseDir}/file.req
@include `${baseDir}/sub dir/file.req`
@include ./presets.req
@include "./presets.req"
```

The file path is **resolved** relative to the current file.

The include directive will execute the request file in the context of the current file. The outcome is the same as if you inlined the content of the included file inside the main file.
This directive is usefull to define request `templates` or `presets`.

Here is an example:

#### Main file

```
@var apiUrl, env?
@import ./env/${env||'dev'}.req

GET ${apiUrl}}/protected-endpoint
```


#### Included file (./env/dev/req)

```
@var username, password
@set apiUrl = "https://my.server.com/api/v1"
# the username and password are specified on the command line as --username and --password
@set auth = base64(username+':'+password)

@header Authorization: ${auth}
@header Accept: application/json
```

The `@headers` directive is setting headers for the current request (from outside the request header lines)


### @run

**Usage**: `@run ./some/request.req`

Run another script in its own context. The current script execution is paused until the child request completes. The response of the request will be injected in the current script as the `$response` variable.

As for the `@include` directive the file argument support any valid string expressions (including string templates). The file is **resolved** relative to the current file.

This differs from the `@include` since the child script execution cannot alter the current request environment. It cannot set variables or headers in the main request.

This can be usefull to create sequential requests runs (like a test suite). 

To access the decoded *(JSON)* body use `$response.body`. To access the response text (not decoded) use `$response.text`. The response status is available as `$response.status`. 
For all available fields see the `IRequest` interface in the sources.

You can then use the response body to prepare the environment for the next request and thus chain several request runs. Exanmple: login then POST an object then PUT to modify the object etc.


### @echo

**Usage**: `@echo message`

Print the message with `console.log`. The directive accepts template literals for variable substitution.

The message argument support any valid string expressions (including string templates).

**Example:** 

```
@echo Username is ${username}
```

### @inspect

**Usage**: `@inspect object`

Print detailed information about a variable value (using node inspect). Usefull to debug.

The object argument should be the name of a variable defiend in the script environment. Javascript expression are njot supported but you can use dots `.` to access properties of the a top level variable.

**Examples** 

```
#will print the current request environemnt 
@inspect $env` 

# print the JSON body of the last request
@inspect $response.body
```

### @import

**Usage**: `@import some/javascript/file.js`

The directive doesn't support expressions or variable expansion. Only tring literals. You can also use strings not surrounded by quotes.

Load a javascript file that exports functions. The functions will be available in the execution scope of the expressions in the current script.

An imported file must export the functions using named exports. Example:

```
export function lowercase(value:any) { return String(value).toLowerCase(); }
export function debug(env:Environment) { console.log(this.file, env.vars) }
```

### @call

**Usage**: `@call function`

The function argument must be the name of an iported function (using `@import` directive). 

The function signature must be: `(env:Environment) => any`.

The function will be called in the context of the request module (i.e. `this` variable will point to the current request module of type `RequestModule`) At execution, the fucntion will receive as argument the current environment (of type `Environment`).

Look into the sources for the methods and properties available on `RequestModule` and `Environment` objects.


### @file

**Usage**: `@file filen`

TODO

## Logging

There are 3 command line options that allows you to control the log verbosity.

1. `-q | --quiet` - do not log anything
2. `-a | --all` - log all requests not only the main one. Requests executed using @run are also logged. The default is to not log child requests.
3. `-l | --log` - this option let you control what is logged. You can specify any combination of: `req,reqh,reqb,resh,resb`. The default is `req, resb`

    - req: log the request line. Example: `GET url`
    - reqh: log the request headers
    - reqb: log the request body
    - resh: log the response headers
    - resb: log the response body

## Replaying requests

You can replay the same request (or suite of requests) over a different input variables. The variables are specified in a CSV file. Each variable is the the column (the column header is the variable name) and each row is a set of variable values.

By using the `reqz --play vars.csv target.req` option the request(s) in target.req will be played one for each set of variables in the csv file.

