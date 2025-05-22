#!/usr/bin/env bash

set -euo pipefail

CHANGELOG_FILE="CHANGELOG.md"

# Get the latest tag that matches semver
TAG=$(git tag --sort=-creatordate | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+' | head -n1)

if [ -z "$TAG" ]; then
  echo "❌ No valid semver tag found (vX.Y.Z)"
  exit 1
fi

VERSION="${TAG#v}"
echo "📦 Extracting release notes for version: $VERSION"

# Find the start line of the current version section
START_LINE=$(grep -n "^## \[$VERSION\]" "$CHANGELOG_FILE" | cut -d: -f1)
if [ -z "$START_LINE" ]; then
  echo "❌ Could not find changelog section for version $VERSION"
  exit 1
fi

# Find the line number of the next version section, or EOF
END_LINE=$(tail -n +$((START_LINE + 1)) "$CHANGELOG_FILE" | grep -n "^## \[" | head -n1 | cut -d: -f1)

if [ -z "$END_LINE" ]; then
  END_LINE=$(wc -l < "$CHANGELOG_FILE")
else
  END_LINE=$((START_LINE + END_LINE - 1))
fi

# Extract the lines AFTER the heading (START_LINE+1 to END_LINE-1)
echo "✂️  Extracting lines $((START_LINE + 1)) to $((END_LINE - 1))"
sed -n "$((START_LINE + 1)),$((END_LINE - 1))p" "$CHANGELOG_FILE" > release_notes.txt

# Find previous version tag
PREV_TAG=$(git tag --sort=-creatordate | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+' | grep -v "^$TAG\$" | head -n1)

# Get repo info
REPO_URL=$(git config --get remote.origin.url | sed -E 's/\.git$//' | sed -E 's#git@github.com:#https://github.com/#')

# Add Full Changelog link
if [ -n "$PREV_TAG" ]; then
  echo "" >> release_notes.txt
  echo "**Full Changelog**: $REPO_URL/compare/$PREV_TAG...$TAG" >> release_notes.txt
  echo "🔗 Added compare link: $REPO_URL/compare/$PREV_TAG...$TAG"
else
  echo "⚠️  No previous tag found, skipping Full Changelog link"
fi

echo "✅ Release notes written to release_notes.txt"
