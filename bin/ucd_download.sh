#!/usr/bin/env bash
#
# Download and unzip the Unicode Character Database XML file
# from Unicode.org.
#

set -o nounset
set -o errexit
set -o pipefail

SCRIPT_HOME="$( cd "$( dirname "$0" )" && pwd )"
BASE_DIR=$(realpath "${SCRIPT_HOME}/..")

echo "INFO: starting download at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

TMP_DIR="${BASE_DIR}/tmp"
if [ ! -d "${TMP_DIR}" ]; then
	echo "INFO: creating temp dir ${TMP_DIR}"
	mkdir -p "${TMP_DIR}"
else
	echo "INFO: using existing temp dir ${TMP_DIR}"
fi

curl \
	--location \
	--output "${TMP_DIR}/ucd.all.flat.zip" \
	--show-error \
	--silent \
	https://www.unicode.org/Public/latest/ucdxml/ucd.all.flat.zip

cd "${TMP_DIR}"
unzip ucd.all.flat.zip

echo "INFO: completed download at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
