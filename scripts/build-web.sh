#!/bin/sh
# Kept for anyone who prefers a shell one-liner; it just calls the node script.
set -e
exec node "$(dirname "$0")/stage.js"
