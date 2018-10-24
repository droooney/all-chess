import * as path from 'path';
import { Duplex } from 'stream';
import * as gulp from 'gulp';
import { argv } from 'yargs';
import run = require('gulp-run');
import * as webpack from 'webpack';
import Bundler = require('parcel-bundler');

import webpackConfig from './webpack.config';
import parcelConfig from './parcel.config';

const execute = (command: string): Duplex => (
  run(command, { verbosity: 3 }).exec()
);

const defaultTask = gulp.parallel(runServerTask, watchClientTask);

export default defaultTask;

export const checkTypes: gulp.TaskFunction = () => (
  execute('tsc --noEmit')
);

export const lint: gulp.TaskFunction = () => (
  execute('eslint . --ext .ts --ext .tsx')
);

export const runServer: gulp.TaskFunction = runServerTask;

async function runServerTask() {
  const { listen } = await import('./app/server');
  const port = await listen();

  console.log(`Listening on ${port}...`);
}

export const watchClient: gulp.TaskFunction = watchClientTask;

export const buildProductionClientBundle: gulp.TaskFunction = buildProductionClientBundleTask;

async function runParcel(isProduction: boolean) {
  const bundler = new Bundler(path.resolve('./parcel-entry.html'), parcelConfig(isProduction));

  await bundler.bundle();
}

// @ts-ignore
async function runWebpack(isProduction: boolean) {
  await new Promise((resolve) => {
    const compiler = webpack(webpackConfig(isProduction));
    const watcher = compiler.watch({}, () => {});

    compiler.hooks.done.tap('gulp-hack', (stats: webpack.Stats) => {
      console.log(stats.toString({
        chunks: false,
        colors: true
      }));

      resolve(stats);

      if (isProduction) {
        watcher.close(() => {});
      }
    });
  });
}

async function watchClientTask() {
  await runParcel(false);
}

async function buildProductionClientBundleTask() {
  await runParcel(true);
}

export function dbMigrationCreate() {
  const name = argv.name || 'new';

  return execute(`sequelize migration:create --name ${name} --debug`);
}

export function dbMigrate() {
  return execute('sequelize db:migrate --debug');
}

export function dbMigrationUndo() {
  return execute('sequelize db:migrate:undo --debug');
}

export function dbMigrationUndoAll() {
  return execute('sequelize db:migrate:undo:all --debug');
}

export function dbSeedCreate() {
  const name = argv.name || 'new';

  return execute(`sequelize seed:create --name ${name} --debug`);
}

export function dbSeed() {
  return execute('sequelize db:seed:all --debug');
}

export const dbSeedRerun = gulp.series(dbSeedUndoAll, dbSeed);

export function dbSeedUndoAll() {
  return execute('sequelize db:seed:undo:all --debug');
}

export function dbCreate() {
  return execute('sequelize db:create --debug');
}

export const dbReset = gulp.series(dbDrop, dbCreate, dbMigrate, dbSeed);

export const dbResetContent = gulp.series(dbMigrationUndoAll, dbMigrate, dbSeed);

export function dbDrop() {
  return execute('sequelize db:drop --debug');
}

