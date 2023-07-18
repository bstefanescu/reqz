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
  -q | --quiet                   Run quitely. Do not output anything.
  -v | --verbose [level]         Verbosity level.
      -v0 - only log the request line.
      -v1 - log the request line and the response body.
      -v2 - log the request line and headers and the response headers and body.
      The default is -v1

  -a | --all                     Log all the requests from the request chain not only the main one.
  -l | --log <string>            Log configuration. Any combination of reqh,reqb,resh,resb separated by commas.
      - reqm - print the request method and url.
      - reqh - print the request headers.
      - reqb - print the request body.
      - resh - print the response headers.
      - resb - print the response body.
      If specified will overwrite the verbosity flag.

  -t | --text                    Output plain text, without colors or JSON formatting
  -d | --doc                     Print target script documentation
  -p | --play <string>           Takes a csv file as value. Play the same request for each set of variables created for each line in the csv file. The csv header is expected to specify
                                 the variable names.
  -c | --col-delimiter <string>  A column delimiter in case --play was specified. The default is the comma character.
  -V, --version                  output the current version
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

You can also create the body from a javascript expression outcome. To do this enclose the javascript expression in parenthesis.

This let's you use the builtin `readFile` function to POST a file content as a body. Binary files are not supported. The files that can be read using readFile must be located inside the same directory (or sub-tree) as the current request script file. 

```
POST https://my.server.com/api/v1/users
Content-Type: application/xml

( readFile('user.xml') )
```

### Variables

Variables can be defined on the command line using `--varName 'varValue'` arguments or can be set in the request script file using the `set` directive.
There are 2 type of variables:
1. required variables - the default one.
2. optional variables. When using JSON like expression to set the request query or body, if a variable is not defined then an 'undefined variable' error will be thrown. To avoid this and to ignore the undefined property you need to declare the variable as optional. 
This can be done using the `var` directive by appending the '?' character to the variable name. The directive can be used to declare required variables  as well. Declaring required variables is optional but is recommended since IDE integration tools may use this information for generating autocompletion.

**Example**

```
var userId, userEmail, firstName?, lastName?
set apiUrl = 'https://my.server.com/api/v1'

PUT ${apiUrl}/users/${userId}

{
  userEmail,
  firstName,
  lastName
}
```

If you don't define the `userEmail` when running the above script then an error is thrown. But, the script will succeed if the `firstName` is not defined, since it is defined as optional. It will be simply ommited from the request body.

There are 3 builtin variable names, that you can use:
1. `$module` - the script module which is currently executed (an instance of `RequestModule`)
2. `$response` - the response object of the last executed request. See `run` directive
3. `$play` - the current csv record when replaying requests using input from a csv file. See the `--play` flag.


### Expressions

There 2 types of expressions:
1. Literal values: "a double quoted string", 'a single quoted string', true, false, null, 123 (i.e. numbers), \``a template literal: Hello ${name}`\`.
2. Javascript expression. Any [ES2020](https://node.green/#ES2020) javascript expression is supported. 
3. String templates not surrounded with backticks. Example: `GET ${apiUrl}/users/${userId}`. These expression can be used in any directive that expects a string as its argument (if not explicitly stated in the directive doc. that it doesn't accept expressions).
Examples: requets URLs, request header values, `include`, `echo` etc.

Expressions are isloated and cannot access javascript globals. If you need to add your own functions to be acessed in expressions you can do so by using the `import` directive.

There are 3 built-in functions available in the expressions scope:
1. `JSON` - the global JSON object.
2. `base64` - this is usefull to generate basic authentication headers.
3. `promptPassword` - this can be used with the `prompt` command.
4. `readFile` - an alias to node `fs.readFileSync`. Only files inside the same directory as the current request script file can be read. The default encoding is `utf8`.
5. `expandFile` - same as `readFile` but will perform variable susbtitutions over the file content.
**Examples:**

```
Authorization: Basic ${base64(username+':'+password)}
```

Posting the content of a file:

```
POST ${apiUrl}/files

(expandFile("data.xml", "utf8"))
```

You can also, load an object described in an external file using string templates for variable substitution.

**Example**

Given a file `data.json`:

```
{
  "email": "${email}",
  "name": "Test User",
}
```

The execution of this script 

```
set email = "foo@bar.com"
set object = JSON.parse(expandFile('./data.json'))
inspect object
```

will print 

```
{ email: 'foo@bar.com', name: 'Test User'}
```

### Comments

Line comments can be done by starting a line using `//` or `#`. 
Block line comments are supported using `/* */` blocks.

You can add documentation to your scripts using a comment block (on top of the file) which starts with a `/**` string

```
/**
 My first script
*/

// List the existing users
GET https://my.server.com/api/v1/users
```

## Directives

Directives are special commands you can use inside a request file. Directives can only be used as the first word on a line. You should not indent directive calls. 

Here is the list of all of the supported directives:

- var
- set
- prompt
- include
- run
- query
- header
- headers
- echo
- inspect
- import

You can also create your own directives. See the Custom Directives section.

### var

**Usage**: `var userid, firstName?, lastName?`

Declare variable names expected in the script file. Optional variables must be suffixed with an `?` character.
As indicated above variables declaration is optional. If you want to avoid `undefined variable` errors when using an optional variable then you must declare the variable as optional.

You should only declare variables that are inherited from the environment (e.g. form the command line). It is useless to declare variables that are defined using the `set` directive.

### set

**Usage**: `set variable = value`

Set a variable. The values can be any valid javascript expression (inlcuding literals like strings, numbers, booleans, null, backtick template expressions).

**Examples:**

```
set apiUrl = "https://my.server.com/api/v1"
set name = 'John Doe'
set port = 8080
set category = null
set url = `https://${host}/${path}`
set user = {
  firstName,
  lastName,
  role: 'reader'
}
set fields = ['name', 'email']
set secure = true
set protocol = secure ? 'https' : 'http'
set lowerCaseEmail = email.toLowerCase()
...
```

The `set` directive can also be used to define a default value for a variable. This can be done using the `?=` assignement oeprator:

```
set env ?= "dev"
```

In the example above the `env` variable is set to `"dev"` only if not yet defined.

### prompt

**Usage:** `prompt {[key: string] : string | {message: string, type?: string}}`

The command is displaying a prompt to get the value from the user for the request variables.

The variable name is the object key, and the object value is either the message to display (i.e. the question) or an object defining the message and the type of the prompt. The possible types are: `input`, `text` (na alias for input), `password`. When used in the terminal, [enquirer](https://www.npmjs.com/package/enquirer) will be used as the prompter so you can use any type supported by enquirer.

If the variable is already defined (i.e. having any other value than undefined) value then the user will not be prompted for its value.

To mask the user input use the type password or the built-in function `promptPassword`.

**Example**

To ask for the username and a password you can use:

```
prompt {
  username: "Your username?",
  password: {message: "Your password?", type: "password"}
}
```

or using `promptPassword`:

```
prompt {
  username: "Your username?",
  password: promptPassword("Your password?")
}
```

### query

**Usage**: 

```
query {
  userId,
  sort,
  verbose:true,
}
```

The query argument must be a javascript object.

Define the query string to be used by the current request. This can be handy to define the query as an object rather that to include it in the URL as an encoded query string. If both a query object and q query string is appended to the URL the two queries will be merged.


### header

**Usage**: `header Accept: application/json`

Set a single header for the current request. Usefull to define header presets in an included file.
The header value accept any valid string expression (including string templates). The header name doesn't accept expressions.

**Example** 

```
header Authorization: ${base64(username+':'+password)}
```

### headers

**Usage**: 

```
headers {
  Accept: "application/json"
  "Content-Type": "application/json"
}
```

Similar to `header` but can set multiple header lines. The headers arguments must be a valid javascript object. 
Using this notation you can conditionally set a header. Setting `null` or `undefined` as the header value will ignore the header.

**Example:**

```
headers {
  "authorization": authToken ? `Bearer ${authToken}` : null
}
```

In the previous example the authorization header will not be set if the `authToken` variable is not defined.


### body

**Usage**: 

```
body {
  email,
  firstName,
  lastName,
  role: "reader"
}
```

Define the body of the current request. The body argument must be a valid javascript object.

This can be handy to define body templates in an included file.

If the request is also defining a body this will overwrite the body defined using the `body` directive.


### include

**Usage:** `include path/to/file.req`

The file argument can be any valid string expression (including string templates)

**Examples:** 
```
include ${baseDir}/file.req
include `${baseDir}/sub dir/file.req`
include ./presets.req
include "./presets.req"
```

The file path is **resolved** relative to the current file.

The include directive will execute the request file in the context of the current file. The outcome is the same as if you inlined the content of the included file inside the main file.
This directive is usefull to define request `templates` or `presets`.

Here is an example:

#### Main file

```
var apiUrl, env?
import ./env/${env||'dev'}.req

GET ${apiUrl}}/protected-endpoint
```


#### Included file (./env/dev/req)

```
var username, password
set apiUrl = "https://my.server.com/api/v1"
# the username and password are specified on the command line as --username and --password
set auth = base64(username+':'+password)

header Authorization: ${auth}
header Accept: application/json
```

The `headers` directive is setting headers for the current request (from outside the request header lines)


### run

**Usage**: `run ./some/request.req`

Run another script in its own context. The current script execution is paused until the child request completes. The response of the request will be injected in the current script as the `$response` variable.

As for the `include` directive the file argument support any valid string expressions (including string templates). The file is **resolved** relative to the current file.

This differs from the `include` since the child script execution cannot alter the current request environment. It cannot set variables or headers in the main request.

This can be usefull to create sequential requests runs (like a test suite). 

To access the decoded *(JSON)* body use `$response.body`. To access the response text (not decoded) use `$response.text`. The response status is available as `$response.status`. 
For all available fields see the `IRequest` interface in the sources.

You can then use the response body to prepare the environment for the next request and thus chain several request runs. Exanmple: login then POST an object then PUT to modify the object etc.


### echo

**Usage**: `echo message`

Print the message with `console.log`. The directive accepts template literals for variable substitution.

The message argument support any valid string expressions (including string templates).

**Example:** 

```
echo `Username is ${username}`
```

### inspect

**Usage**: `inspect [object]`

Print detailed information about a variable (using node inspect). Usefull to debug.

The object argument is optional. If used it should be the name of a variable defined in the script environment. Javascript expression are njot supported but you can use dots `.` to access properties of the a top level variable.

If the object argument is not defined then the execution environment will be printed.

**Examples** 

```
#will print the current execution environemnt 
inspect 

# print the JSON body of the last request
inspect $response.body
```

### import

**Usage**: `import some/javascript/file.js`

The directive doesn't support expressions or variable expansion. Only tring literals. You can also use strings not surrounded by quotes.

Load a javascript file that exports functions. The functions will be available in the execution scope of the expressions in the current script.

An imported file must export the functions using named exports. Example:

```
export function lowercase(value:any) { return String(value).toLowerCase(); }
export function debug(env:Environment) { console.log(this.file, env.vars) }
```

## Custom Directives

You can create a custom directive by defining a function in an external javascript file which you import into the script using the `import` directive. To indicate that your function is a custom directive you must attach to it some meta-data as follows:

Note that custom directive names also accept the `@` character as the first character of the directive name.

```
export function helloDirective(env, arg) {
  console.log('hello', arg);
}
helloDirective.__REQZ_DIRECTIVE = {
  optional: false, // if true the directive will not throw an error if no argument is passed
  args: "string", // the type of argument it accepts
  name: "hello"  // the directive name
}
```

As soon as the file is imported the directive becomes available. Let's use the above directive:

```
import 'hello.js'

hello world!
```

it wil output: `hello world!`

There are three type of arguments: 
* string - support variable expansions, plain string using or not using quotes as the `include` directive 
* object - a javascript object as the `query` directive
* array - a javascript array
* a custom argument parser function. See the sources for more details.

For the complete directive definition object see `IDirectiveDefinition` interface.


## Logging

There are 3 command line options that allows you to control the log verbosity.

1. `-q | --quiet` - do not log anything
2. `-a | --all` - log all requests not only the main one. Requests executed using `run` are also logged. The default is to not log child requests.
3. `-l | --log` - this option let you control what is logged. You can specify any combination of: `req,reqh,reqb,resh,resb`. The default is `req, resb`

    - req: log the request line. Example: `GET url`
    - reqh: log the request headers
    - reqb: log the request body
    - resh: log the response headers
    - resb: log the response body


## Replaying requests

You can replay the same request (or suite of requests) over a different input variables. The variables are specified in a CSV file. Each variable is the the column (the column header is the variable name) and each row is a set of variable values.

By using the `reqz --play vars.csv target.req` option the request(s) in target.req will be played one for each set of variables in the csv file.

