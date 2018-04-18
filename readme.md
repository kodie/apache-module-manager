# Apache Module Manager

[![npm package version](https://img.shields.io/npm/v/apache-module-manager.svg?style=flat-square)](https://www.npmjs.com/package/apache-module-manager)
[![Travis build status](https://img.shields.io/travis/kodie/apache-module-manager.svg?style=flat-square)](https://travis-ci.org/kodie/apache-module-manager)
[![npm package downloads](https://img.shields.io/npm/dt/apache-module-manager.svg?style=flat-square)](https://www.npmjs.com/package/apache-module-manager)
[![code style](https://img.shields.io/badge/code_style-standard-yellow.svg?style=flat-square)](https://github.com/standard/standard)
[![license](https://img.shields.io/github/license/kodie/apache-module-manager.svg?style=flat-square)](license.md)

[![asciicast](https://asciinema.org/a/176960.png)](https://asciinema.org/a/176960)

A CLI tool for enabling/disabling [Apache](https://httpd.apache.org) modules.

## Installation

```shell
$ npm install --global apache-module-manager
```

## Note

This will modify your Apache config file. It is your responsibility to make a backup. This has only been tested on macOS with the default Apache installation. Use at your own risk.

## Usage

### `list|l [-d -e -s <columns>] [search]`

List/search for modules.

#### Options

| Long       | Short | Description                                                                    |
|------------|-------|--------------------------------------------------------------------------------|
| --disabled | -d    | Only display disabled modules                                                  |
| --enabled  | -e    | Only display enabled modules                                                   |
| --sort     | -s    | A comma separated list of columns to sort by (defaults to `enabled,name,path`) |


#### Examples

```shell
# Display all modules
$ amm list
$ amm l

# Display modules that contain 'php'
$ amm list php

# Display all modules and sort them by their line number
$ amm list --sort line

# Display all currently enabled modules
$ amm list -e
```

##### Example Output

```shell
$ amm list -s line

ID  NAME                       PATH                                                ENABLED LINE
0   authn_file_module          libexec/apache2/mod_authn_file.so                   true    71
1   authn_dbm_module           libexec/apache2/mod_authn_dbm.so                    false   72
2   authn_anon_module          libexec/apache2/mod_authn_anon.so                   false   73
3   authn_dbd_module           libexec/apache2/mod_authn_dbd.so                    false   74
4   authn_socache_module       libexec/apache2/mod_authn_socache.so                false   75
5   authn_core_module          libexec/apache2/mod_authn_core.so                   true    76
6   authz_host_module          libexec/apache2/mod_authz_host.so                   true    77
7   authz_groupfile_module     libexec/apache2/mod_authz_groupfile.so              true    78
8   authz_user_module          libexec/apache2/mod_authz_user.so                   true    79
9   authz_dbm_module           libexec/apache2/mod_authz_dbm.so                    false   80
...
```

### `enable|e <search>`

Enable a module. If multiple modules match the search term, a select prompt will be displayed allowing you to choose from the matches. The `sudo` prefix is required since the script modifies a system file.

#### Examples

```shell
$ sudo amm enable php
$ sudo amm e php
```

##### Example Output

```shell
$ sudo amm enable php

? Which module are you looking for? (Use arrow keys)
  php7_module libexec/apache2/libphp7.so
❯ php5_module /usr/local/opt/php@5.6/lib/httpd/modules/libphp5.so
? Enable php5_module (/usr/local/opt/php@5.6/lib/httpd/modules/libphp5.so)? (Y/n)
✔ Changed line 180 to LoadModule php5_module /usr/local/opt/php@5.6/lib/httpd/modules/libphp5.so
? Restart Apache (/usr/sbin/apachectl restart)? (Y/n)
```

### `disable|d <search>`

Disable a module. If multiple modules match the search term, a select prompt will be displayed allowing you to choose from the matches. The `sudo` prefix is required since the script modifies a system file.

#### Examples

```shell
$ sudo amm disable php
$ sudo amm d php
```

##### Example Output

```shell
$ sudo amm disable php

? Disable php5_module (/usr/local/opt/php@5.6/lib/httpd/modules/libphp5.so)? (Y/n)
✔ Changed line 180 to #LoadModule php5_module /usr/local/opt/php@5.6/lib/httpd/modules/libphp5.so
? Restart Apache (/usr/sbin/apachectl restart)? (Y/n)
```

### `switch <old/new search> [new search]`

Disable a status and enable another one. If only one argument if given, the first argument will be used to search for both the module to disable and enable. If multiple modules match a search term, a select prompt will be displayed allowing you to choose from the matches. The `sudo` prefix is required since the script modifies a system file.

#### Examples

```shell
$ sudo amm switch php5 php7
$ sudo amm s php
```

##### Example Output

```shell
$ sudo amm switch php

? Disable php5_module (/usr/local/opt/php@5.6/lib/httpd/modules/libphp5.so)? (Y/n)
✔ Changed line 180 to #LoadModule php5_module /usr/local/opt/php@5.6/lib/httpd/modules/libphp5.so
? Enable php7_module (libexec/apache2/libphp7.so)? (Y/n)
✔ Changed line 176 to LoadModule php7_module libexec/apache2/libphp7.so
? Restart Apache (/usr/sbin/apachectl restart)? (Y/n)
```

### Config File

By default, AMM will check if the file `~/.amm.json` exists and load config options from it.

#### Default Config

```json
{
  "apache_config": "/etc/apache2/httpd.conf",
  "apache_restart": "/usr/sbin/apachectl restart"
}
```

### Global Options

These options can be used with any of the above commands:

| Long            | Short | Description                                   |
|-----------------|-------|-----------------------------------------------|
| --version       | -V    | Display current Apache Module Manager version |
| --apache-config | -a    | Path to the Apache config file                |
| --config        | -c    | Path to AMM config file                       |
| --help          | -h    | Display help information                      |

### Environment Variables

These environment variables can be used to change different config options:

| Variable          | Description                    |
|-------------------|--------------------------------|
| AMM_CONFIG        | Path to an AMM config file     |
| AMM_APACHE_CONFIG | Path to the Apache config file |

## TODO/Ideas

 - [ ] Automated testing
 - [ ] Better Linux support/testing
 - [ ] Support for multiple Apache config files (file traversing?)
 - [ ] Allow for multiple modules to be enabled/disabled at the same time
 - [ ] Automated Apache config file backups
 - [ ] Implement module so that AMM can be used by other packages

## License
MIT. See the [license.md file](license.md) for more info.
