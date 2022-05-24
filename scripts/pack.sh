#!/bin/bash
cd $(dirname "$0")/..
esbuild src/index.ts --bundle --outfile=dist/index.js --platform=node
for script in scripts/*.ts; do
    esbuild $script --bundle --outfile=dist/$(basename $script .ts).js --platform=node
done
