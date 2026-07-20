#!/usr/bin/env bash
# Helper: run a command on the remote server via plink with pinned host key.
# Usage: ./.deploy-ssh.sh "remote command"
HK="SHA256:HH8IlerbeYi0rAYMVl9wHnkyzSDenn/5xTTbAQWrAxg"
PW='xamonxx031'
exec plink -batch -hostkey "$HK" -P 2201 -pw "$PW" mki@100.76.23.12 "$1"
