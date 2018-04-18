#!/usr/bin/env node
/* eslint prefer-promise-reject-errors: ["error", {"allowEmptyReject": true}] */
'use strict'

const chalk = require('chalk')
const columnify = require('columnify')
const { execSync } = require('child_process')
const fs = require('fs')
const Fuse = require('fuse.js')
const inquirer = require('inquirer')
const lineNumber = require('line-number')
const os = require('os')
const program = require('commander')
const sort = require('fast-sort')
const version = require('./package.json').version

const reg = /^(#)?LoadModule[ \t](\S*)[ \t](\S*)$/

var config = {
  apache_config: '/etc/apache2/httpd.conf',
  apache_restart: '/usr/sbin/apachectl restart'
}

var apacheConfig
var lines
var mods
var userConfig

function changeModuleStatus (mod, status) {
  return new Promise((resolve, reject) => {
    if (status) {
      var dupCheck = mods.filter(m => m.enabled && m.name === mod.name).length

      if (dupCheck) {
        console.log(chalk`{red ✘} There is already an {green enabled} module named {yellow ${mod.name}}`)
        return reject()
      }
    }

    return inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: chalk`${status ? 'Enable' : 'Disable'} {cyan ${mod.name}} ({yellow ${mod.path}})?`
    }).then(a => {
      if (!a['confirm']) return reject()

      var line = lines[mod.line - 1]

      if (line.startsWith(status ? '#' : 'L')) {
        mods[mod.id].enabled = status

        if (status) {
          editLine(mod.line, line.substr(1))
        } else {
          editLine(mod.line, '#' + line)
        }

        return resolve()
      }
    })
  })
}

function chooseModule (find, list) {
  if (!list) list = mods

  var fuse = new Fuse(list, {
    keys: ['name'],
    threshold: 0.1
  })
  var search = fuse.search(find)

  return new Promise((resolve, reject) => {
    if (search.length === 0) {
      console.log(chalk`{red ✘} No applicable modules found matching {yellow ${find}}`)
      return reject()
    } else if (search.length === 1) {
      return resolve(search[0])
    } else {
      return inquirer.prompt({
        name: 'mod',
        type: 'list',
        message: 'Which module are you looking for?',
        choices: search.map((m, i) => Object({
          key: i,
          name: chalk`${m.name} {yellow ${m.path}}`,
          value: m
        }))
      }).then(a => resolve(a.mod))
    }
  })
}

function editLine (lineNumber, line) {
  lines[lineNumber - 1] = line
  apacheConfig = lines.join('\n')

  try {
    fs.writeFileSync(config.apache_config, apacheConfig)
    console.log(chalk`{green ✔} Changed line {cyan ${lineNumber}} to {yellow ${line}}`)
  } catch (e) {
    console.log(chalk`{red ✘} An error occured while trying to edit {yellow ${config.apache_config}}: ${e.code}`)
    console.log(chalk`{yellow !} You may want to retry that command with the {cyan sudo} prefix`)
    process.exit(1)
  }
}

function getModules () {
  var modList = apacheConfig.match(RegExp(reg, 'gm'))
  var lineList = lineNumber(apacheConfig, reg)

  modList = modList.map((m, id) => {
    var mod = reg.exec(m)

    return {
      id,
      name: mod[2],
      path: mod[3],
      enabled: !mod[1],
      line: lineList[id].number
    }
  })

  mods = modList
  return modList
}

function promptRestart () {
  return new Promise((resolve, reject) => {
    if (!config.apache_restart) return resolve()

    return inquirer.prompt({
      name: 'confirm',
      type: 'confirm',
      message: chalk`Restart Apache ({yellow ${config.apache_restart}})?`
    }).then(a => {
      if (a['confirm']) execSync(config.apache_restart)
      return resolve(a['confirm'])
    })
  })
}

function setup () {
  var newUserConfig = os.homedir() + '/.amm.json'

  if (process.env.AMM_CONFIG) newUserConfig = process.env.AMM_CONFIG
  if (program.config) newUserConfig = program.config

  if (fs.existsSync(newUserConfig)) {
    try {
      userConfig = newUserConfig
      newUserConfig = require(newUserConfig)
      Object.assign(config, newUserConfig)
    } catch (e) {
      console.log(e)
      console.log(chalk`{red ✘} An error occured while loading specified user config file {yellow ${newUserConfig}}`)
    }
  } else if (process.env.AMM_CONFIG || program.config) {
    console.log(chalk`{yellow !} Specified user config file {yellow ${newUserConfig}} was not found`)
  }

  var newApacheConfig = config.apache_config

  if (process.env.AMM_APACHE_CONFIG) newApacheConfig = process.env.AMM_APACHE_CONFIG
  if (program.apacheConfig) newApacheConfig = program.apacheConfig

  if (fs.existsSync(newApacheConfig)) {
    config.apache_config = newApacheConfig
  } else {
    console.log(chalk`{red ✘} Apache config file {yellow ${newApacheConfig}} was not found`)
    process.exit(1)
  }

  apacheConfig = fs.readFileSync(config.apache_config, 'utf8')
  lines = apacheConfig.split('\n')

  getModules()

  if (userConfig) console.log(chalk`{yellow AMM Config:} ${userConfig}`)
  console.log(chalk`{yellow Apache Config:} ${config.apache_config}\n`)
}

program
  .command('disable <module>')
  .alias('d')
  .description('Disable module(s)')
  .action((search, cmd) => {
    setup()

    chooseModule(search, mods.filter(m => m.enabled))
      .then(mod => changeModuleStatus(mod, false))
      .then(() => promptRestart())
      .catch(() => {})
  })

program
  .command('enable [module]')
  .alias('e')
  .description('Enable module(s)')
  .action((search, cmd) => {
    setup()

    chooseModule(search, mods.filter(m => !m.enabled))
      .then(mod => changeModuleStatus(mod, true))
      .then(() => promptRestart())
      .catch(() => {})
  })

program
  .command('list [search]')
  .alias('l')
  .description('List modules')
  .option('-d, --disabled', 'Only display disabled modules')
  .option('-e, --enabled', 'Only display enabled modules')
  .option('-s, --sort <columns>', 'Sort results by column values')
  .action((search, cmd) => {
    setup()

    var columns = ['id', 'name', 'path', 'enabled', 'line']

    if (cmd.disabled) mods = mods.filter(m => !m.enabled)
    if (cmd.enabled) mods = mods.filter(m => m.enabled)

    if (search) {
      var fuse = new Fuse(mods, {
        keys: ['name'],
        threshold: 0.1
      })
      mods = fuse.search(search)
    }

    if (!mods.length) {
      console.log(chalk`{red ✘} No applicable modules found`)
      return
    }

    var sortOrder = 'enabled,name,path'
    var sortFuncs = []

    if (cmd.sort) sortOrder = cmd.sort

    sortOrder
      .split(',')
      .map(s => {
        s = s.toLowerCase()

        if (columns.includes(s)) {
          var func = m => m[s]
          if (s === 'enabled') func = m => m.enabled ? 0 : 1
          sortFuncs.push(func)
        }
      })

    if (sortFuncs.length) sort(mods).asc(sortFuncs)

    var data = columnify(mods, {
      columns,
      config: {
        enabled: {
          dataTransform: enabled => {
            if (enabled === 'true') {
              return chalk.green(enabled)
            } else {
              return chalk.red(enabled)
            }
          }
        }
      }
    })

    console.log(data)
  })

program
  .command('switch <old-module> [new-module]')
  .alias('s')
  .description('Switch out module(s)')
  .action((disable, enable, cmd) => {
    setup()

    if (!enable) enable = disable

    var enabledMods = mods.filter(m => m.enabled)
    var disabledMods = mods.filter(m => !m.enabled)

    chooseModule(disable, enabledMods)
      .then(mod => changeModuleStatus(mod, false))
      .then(() => chooseModule(enable, disabledMods))
      .then(mod => changeModuleStatus(mod, true))
      .then(() => promptRestart())
      .catch(() => {})
  })

console.log(chalk`{greenBright Apache Module Manager v${version}} (https://github.com/kodie/apache-module-manager)`)
console.log(chalk`by {cyanBright Kodie Grantham} (http://kodieg.com)\n`)

program
  .version(version)
  .option('-a, --apache-config <path>', 'Apache config path')
  .option('-c, --config <path>', 'AMM config path')
  .parse(process.argv)

if (process.argv.length < 3) program.help()
