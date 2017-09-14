#!/bin/sh

yarn build
gco master
mv dist/* ./
gc -m "added dist"
rm -rf dist/
g push origin master