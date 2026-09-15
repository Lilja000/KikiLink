#!/bin/sh
set -eu
umask 077
unset DEBUG NODE_DEBUG NODE_OPTIONS
exec "$@"
