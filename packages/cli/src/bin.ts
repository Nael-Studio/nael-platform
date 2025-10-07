#!/usr/bin/env bun
import { run } from './index';

const main = async () => {
  const exitCode = await run();
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
};

main().catch((error) => {
  console.error('Fatal error executing Nael CLI');
  console.error(error);
  process.exit(1);
});
