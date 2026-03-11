#!/bin/zsh
# Alfred workflow trigger for GitHub Actions deploys
# Usage: deploy-trigger.sh <target>
# Targets: triage, velo-staging, velo-prod, alex
#
# Alfred workflow should call:
#   /Users/pmcp/Projects/nuxt-crouton/scripts/deploy-trigger.sh "$1" &
#   echo "Triggered"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

QUERY="$1"
REPO="pmcp/nuxt-crouton"

case "$QUERY" in
  triage)
    WORKFLOW="deploy-triage.yml"
    ENV="production"
    LABEL="Triage production"
    ;;
  velo-staging)
    WORKFLOW="deploy-velo.yml"
    ENV="staging"
    LABEL="Velo staging"
    ;;
  velo-prod)
    WORKFLOW="deploy-velo.yml"
    ENV="production"
    LABEL="Velo production"
    ;;
  alex)
    WORKFLOW="deploy-alexdeforce.yml"
    ENV="production"
    LABEL="Alexdeforce production"
    ;;
  *)
    terminal-notifier -title "Deploy" -message "Unknown target: $QUERY"
    exit 1
    ;;
esac

LOG="/tmp/deploy.log"
echo "$(date) - Starting deploy: $QUERY" > "$LOG"

# Trigger the workflow
gh workflow run "$WORKFLOW" --ref main -f environment="$ENV" -R "$REPO"

# Wait for GitHub to register it
sleep 10

RUN_ID=$(gh run list --workflow="$WORKFLOW" -L 1 --json databaseId -q '.[0].databaseId' -R "$REPO")
RUN_URL="https://github.com/$REPO/actions/runs/$RUN_ID"
RUN_STATUS=$(gh run list --workflow="$WORKFLOW" -L 1 --json status -q '.[0].status' -R "$REPO")

echo "$(date) - RUN_ID=$RUN_ID STATUS=$RUN_STATUS" >> "$LOG"

if [ -n "$RUN_ID" ]; then
  terminal-notifier -title "Deploy Started" -message "$LABEL ($RUN_STATUS)"
else
  terminal-notifier -title "Deploy" -message "$LABEL failed to start"
fi

# Watch for completion
if gh run watch "$RUN_ID" -R "$REPO" --exit-status > /dev/null 2>&1; then
  terminal-notifier -title "Deploy OK" -message "$LABEL deployed successfully"
else
  terminal-notifier -title "Deploy Failed" -message "$LABEL deploy failed"
fi
