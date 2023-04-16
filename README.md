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

### Comments

You can add comments by starting aline with a `#` character:

```
# List the existing users
GET https://my.server.com/api/v1/users
```

### Variables

We already seen we can pass variables from the command line. Use the double mustache notation to use the variable in the file: 

```
GET https://my.server.com/api/v1/users?email={{email}}
```

You can also define variables inside the request file:

```
@set apiUrl="https://my.server.com/api/v1"

GET {{apiUrl}}/users?email={{email}}
```

**Important:** when you use the `@set` directive you must double or single quotes to set string values.
Go to the `@set` directive documentation for more info about the accepted values.

There a re 3 builtin variable names, that you should not use:
1. `$env` - the request environment - usefull to debug using `@inspect` directive
2. `$response` - the lresponse object of the last executed request. See `@run` directive
3. `$play` - the current csv record when replaying a csv defining different values for the same variables (i.e. records). See `--play` flag.

### Expressions

A mustache expressions is composed from three parts:

1. a variable reference. that supports multi level properties using the dot character to access chiild properties. **Example:** `user` or `user.email`.
2. An optional default value which is applied if the variable is null or undefined. The default value cannot be another variable but a literal (either a double / single quoted string a number or a boolean). To apply a defualt value you should use the append the value prefixed by the `?` character. 
**Example:** `userName ? "john"`
3. An optional set of filters that will be applied on the variable value. Use the pipe character `|` to specify the filters. 
**Example:**  `user.email ? "john@doe.com" | trim | lowercase`

Here is another example using the `base64` fitler to set the Authorixzation header

```
@set auth = `{{username}}:{{password}}`

GET {{apiUrl}}/protected-endpoint
Authorization: Basic {{auth | base64}}
```

There are a few built-in filters: `json`, `base64`, `trim`, 'lowercase', 'uppercase'. You can define your own filters and load them using the `@lib` directive.

## Directives

Directives are special commands you can use inside a request file. To use a directive you should start the line (spaces are ignored) with the directive name which is prefixed with the `@` character.

Here is the list of all of the supported directives:

- @set
- @include
- @header
- @headers
- @echo
- @inspect
- @run
- @lib
- @call

### @set

**Usage**: `@set variable = value`

Set a variable. The values can be: strings, numbers, booleans, null, template strings, variable references.

To define a string variable surround it by double or single quotes:

```
@set apiUrl = "https://my.server.com/api/v1"
```

or 

```
@set apiUrl = 'https://my.server.com/api/v1'
```

You can use the escape character as usual to add qutoes inside a quoted string. 
Ex: `@set msg = "Hello \"World\""`

To define numbers use a number literal:

```
@set port = 8080
```

Same for booleans:

```
@set verbose = true
```

You can even set a variable to null:

```
@set name = null
```

To define a string with variable substitutions use a template literal (and souround variables using mustaches):

```
@set url = `https://{{host}}/{{path}}`
```

You can also assign another variable:

```
@set x = y
```

You can apply a default value or filters as supported by the reqz expression:

```
@set lowerCaseEmail = email ? "john@doe.com" | lowercase
```

The `@set` directive can also be used to define a default value for a variable. This can be done using the `?=` assignement oeprator:

```
@set env ?= "dev"
```

In the example above the `env` variable is set to `"dev"` only if not yet defined.

### @include

**Usage:** `@include path/to/file.req`

The file path supports variable expansion like a template literal but not surrounded by backtick characters `\``. 
**Example:** `@include {baseDir}/file.req`

The file path is **resolved** relative to the current file.

The include directive will execute the request file in the context of the current file. The outcome is the same as if you inlined the content of the included file inside the main file.
This directive is usefull to define request `templates` or `presets`.

Here is an example:

#### Main file

```
@set env ?= "dev"
@import ./env/{{env?"dev"}}.req

GET {{apiUrl}}/protected-endpoint
```

#### Included file (./env/dev/req)

```
@set apiUrl = "https://my.server.com/api/v1"
# the username and password are specified on the command line as --username and --password
@set auth = `{{username}}:{{password}}`

@headers
Authorization: {{auth | base64}}
Accept: application/json
```

The `@headers` directive is setting headers for the current request (from outside the request header lines)

### @run

**Usage**: `@run ./some/request.req`

As for the `@include` directive the path support variable expansion. The file is **resolved** relative to the current file.

The request described in the taregt file will be executed. THis differs from the `@include` since the target request cannot alter the current request environment. It cannot set variables or headers in the main request.

This can be usefull to create sequential requests runs (like a test suite). 
After the target request is executed the response object will be set in the caller environment as the `$response` variable. To access the decoded (JSON) body use `$response.body`. To access the response text (not decoded) use `$response.text`. The response status is available as `$response.status`. 
For all available fields see the `IRequest` interface in the sources.

You can then use the response body to prepare the environment for the next request and thus chain several request runs that depends each one fro the previous one. Exanmple: login then POST an object then PUT to modify the object etc.

### @echo

**Usage**: `@echo Hello World!`

Print something with `console.log`. The directive accepts template literals for variable substitution.

**Example:** `@echo Username is {{username}}`

### @inspect

**Usage**: `@inspect someObject`

Print detailed information about a variable value (using node inspect). Usefull to debug.

**Example:** `@inspect $env` will print the current request environemnt 

### @header

**Usage**: `@header Accept: application/json`

Set a single header for the current request. Usefull to define header presets in an included file.
The header value accept variable subsitution. But not the header name.

**Example:** `@header Authorization: Basic {{auth | base64}}`

### @headers

**Usage**: 

```
@headers
Accept: application/json
Content-Type: application/json
```

Similar to `@header` but can set multiple header lines. The headers are collected until other directive is found or the end of file is reached. Also, as `@header` this directive accepts variable expansion for header values.

### @lib

**Usage**: `@lib some/javascript/file.js`

The directive doesn't support variable expansion.

Load a javascript file that exports functions. The functions will be available as filters or can be invoked using the `@call` directive.

There are two types of fucntions:

1. Functions that are usable as filters. The functions takes an input value and return and output value: `(value:any) => any`
2. Functions that are callbable using the `@call` directive. These functions can be uses to alter the environment and are called in the context of the current request (i.e. `this` will point to the current request module). The signature is: `(this:RequestModule, env: Environment) => void`

A library file should export the functions using named exports. Example:

```
export function lowercase(value:any) { return String(value).toLowerCase(); }
export function debug(env:Environment) { console.log(this.file, env.vars) }
```

### @call

**Usage**: `@call someFunction`

Call a function loaded using `@lib` directive. The function tajes an argument of type Environment and the `this` variable will point to the `RequestModule` object.

The `Environment` object has 3 fields: `vars`, `headers` and `functions` that represents the current defined vars (using the `@set` directive or the command line), the current defined headers (using `@header` or `@headers` directives) and the loaded fucntions (using the `@lib` directive)


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

