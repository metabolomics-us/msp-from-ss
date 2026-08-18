#!/usr/bin/env bash
# Builds+pushes the app image to ECR, provisions (or re-syncs) the Lightsail
# instance for mspcreator.metabolomics.us, and deploys via docker compose
# (the instance only ever pulls the image — it never builds from source).
#
# Safe to re-run: every step checks current state before acting.
#   - ECR repo / IAM pull user / Lightsail key pair / instance: created only
#     if they don't already exist.
#   - Image: always rebuilt locally and pushed as `:latest`; this is also how
#     you deploy new changes.
#   - Firewall ports: reset to the same 22/80/443 rule set each run.
#   - DNS record: UPSERT'd to the instance's current public IP each run
#     (this instance uses a dynamic IP by design, so re-running this script
#     after a stop/start is how you re-point DNS at the new address).
#
# Requires: aws CLI v2, docker, ssh, scp, configured AWS credentials with
# Lightsail + Route53 + ECR + IAM access.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."   # repo root

# ---- Config ---------------------------------------------------------------
REGION="us-west-2"
AVAILABILITY_ZONE="${REGION}a"
INSTANCE_NAME="mspcreator"
BLUEPRINT_ID="ubuntu_22_04"
BUNDLE_ID="micro_3_0"
KEY_PAIR_NAME="mspcreator-keypair"
KEY_PAIR_FILE="docker/.keys/${KEY_PAIR_NAME}.pem"
DOMAIN="mspcreator.metabolomics.us"
HOSTED_ZONE_ID="Z2ANBWTR462YC8"   # metabolomics.us
REMOTE_USER="ubuntu"
REMOTE_DIR="/home/${REMOTE_USER}/mspcreator"
TAGS_FILE="aws-tags.json"
ENV_FILE="docker/.env"

ECR_REPO_NAME="mspcreator"
IAM_PULL_USER="mspcreator-ecr-pull"
IAM_PULL_CREDS_FILE="docker/.keys/${IAM_PULL_USER}-credentials.json"

log() { echo "==> $*"; }

command -v aws >/dev/null || { echo "aws CLI is required" >&2; exit 1; }
command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }

# ---- Tags (from aws-tags.json) --------------------------------------------
# Lightsail/EC2-style "key=,value=" tags and IAM/ECR-style "Key=,Value=" tags
# are both derived from the same aws-tags.json.
LIGHTSAIL_TAG_ARGS=()
AWS_TAG_ARGS=()
if [ -f "$TAGS_FILE" ]; then
    while IFS='=' read -r key value; do
        [ -n "$key" ] || continue
        LIGHTSAIL_TAG_ARGS+=("key=${key},value=${value}")
        AWS_TAG_ARGS+=("Key=${key},Value=${value}")
    done < <(python3 -c "
import json
with open('${TAGS_FILE}') as f:
    for k, v in json.load(f).items():
        print(f'{k}={v}')
")
fi

# ---- .env (DOMAIN / EMAIL / ECR_IMAGE for compose) -------------------------
if [ ! -f "$ENV_FILE" ]; then
    log "Creating ${ENV_FILE} from docker/.env.example"
    cp docker/.env.example "$ENV_FILE"
fi

upsert_env_var() {
    local key="$1" value="$2"
    if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
        sed -i "s#^${key}=.*#${key}=${value}#" "$ENV_FILE"
    else
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

# ---- ECR repo ---------------------------------------------------------------
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
ECR_REPO_URI="${ECR_REGISTRY}/${ECR_REPO_NAME}"
ECR_IMAGE="${ECR_REPO_URI}:latest"

if aws ecr describe-repositories --repository-names "$ECR_REPO_NAME" --region "$REGION" >/dev/null 2>&1; then
    log "ECR repository ${ECR_REPO_NAME} already exists"
else
    log "Creating ECR repository ${ECR_REPO_NAME}"
    aws ecr create-repository \
        --repository-name "$ECR_REPO_NAME" \
        --region "$REGION" \
        --image-scanning-configuration scanOnPush=true \
        ${AWS_TAG_ARGS:+--tags "${AWS_TAG_ARGS[@]}"} >/dev/null
fi

# ---- Build + push image -----------------------------------------------------
log "Building image ${ECR_IMAGE}"
docker build -f docker/Dockerfile -t "$ECR_IMAGE" .

log "Logging in to ${ECR_REGISTRY}"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

log "Pushing ${ECR_IMAGE}"
docker push "$ECR_IMAGE"

upsert_env_var "ECR_IMAGE" "$ECR_IMAGE"

# ---- IAM user for the instance to pull from ECR (read-only, this repo only) --
if [ -f "$IAM_PULL_CREDS_FILE" ]; then
    log "Reusing cached credentials for IAM user ${IAM_PULL_USER}"
else
    log "Creating IAM user ${IAM_PULL_USER} (ECR pull-only, scoped to ${ECR_REPO_NAME})"
    if ! aws iam get-user --user-name "$IAM_PULL_USER" >/dev/null 2>&1; then
        aws iam create-user --user-name "$IAM_PULL_USER" \
            ${AWS_TAG_ARGS:+--tags "${AWS_TAG_ARGS[@]}"} >/dev/null
    fi

    REPO_ARN="arn:aws:ecr:${REGION}:${ACCOUNT_ID}:repository/${ECR_REPO_NAME}"
    POLICY_DOCUMENT=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {"Effect": "Allow", "Action": "ecr:GetAuthorizationToken", "Resource": "*"},
    {"Effect": "Allow", "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ], "Resource": "${REPO_ARN}"}
  ]
}
JSON
)
    aws iam put-user-policy \
        --user-name "$IAM_PULL_USER" \
        --policy-name "ecr-pull-${ECR_REPO_NAME}" \
        --policy-document "$POLICY_DOCUMENT"

    mkdir -p "$(dirname "$IAM_PULL_CREDS_FILE")"
    aws iam create-access-key --user-name "$IAM_PULL_USER" --output json > "$IAM_PULL_CREDS_FILE"
    chmod 600 "$IAM_PULL_CREDS_FILE"
fi

PULL_ACCESS_KEY_ID=$(python3 -c "import json; print(json.load(open('${IAM_PULL_CREDS_FILE}'))['AccessKey']['AccessKeyId'])")
PULL_SECRET_ACCESS_KEY=$(python3 -c "import json; print(json.load(open('${IAM_PULL_CREDS_FILE}'))['AccessKey']['SecretAccessKey'])")

# ---- Key pair ---------------------------------------------------------------
if aws lightsail get-key-pair --key-pair-name "$KEY_PAIR_NAME" --region "$REGION" >/dev/null 2>&1; then
    log "Key pair ${KEY_PAIR_NAME} already exists"
else
    log "Creating key pair ${KEY_PAIR_NAME}"
    mkdir -p "$(dirname "$KEY_PAIR_FILE")"
    aws lightsail create-key-pair \
        --key-pair-name "$KEY_PAIR_NAME" \
        --region "$REGION" \
        --query 'privateKeyBase64' --output text > "$KEY_PAIR_FILE"
    chmod 600 "$KEY_PAIR_FILE"
fi

# ---- Instance ---------------------------------------------------------------
if aws lightsail get-instance --instance-name "$INSTANCE_NAME" --region "$REGION" >/dev/null 2>&1; then
    log "Instance ${INSTANCE_NAME} already exists"
else
    log "Creating instance ${INSTANCE_NAME}"
    USER_DATA=$(cat <<'CLOUDINIT'
#!/usr/bin/env bash
set -e
apt-get update
apt-get install -y ca-certificates curl gnupg awscli
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
usermod -aG docker ubuntu
CLOUDINIT
)

    aws lightsail create-instances \
        --instance-names "$INSTANCE_NAME" \
        --availability-zone "$AVAILABILITY_ZONE" \
        --blueprint-id "$BLUEPRINT_ID" \
        --bundle-id "$BUNDLE_ID" \
        --key-pair-name "$KEY_PAIR_NAME" \
        --user-data "$USER_DATA" \
        --region "$REGION" \
        ${LIGHTSAIL_TAG_ARGS:+--tags "${LIGHTSAIL_TAG_ARGS[@]}"}
fi

log "Waiting for instance to be running..."
until [ "$(aws lightsail get-instance-state --instance-name "$INSTANCE_NAME" --region "$REGION" --query 'state.name' --output text)" = "running" ]; do
    sleep 5
done

# ---- Firewall ---------------------------------------------------------------
log "Setting firewall rules (22, 80, 443)"
aws lightsail put-instance-public-ports \
    --instance-name "$INSTANCE_NAME" \
    --region "$REGION" \
    --port-infos \
        fromPort=22,toPort=22,protocol=TCP,cidrs=0.0.0.0/0 \
        fromPort=80,toPort=80,protocol=TCP,cidrs=0.0.0.0/0 \
        fromPort=443,toPort=443,protocol=TCP,cidrs=0.0.0.0/0

PUBLIC_IP=$(aws lightsail get-instance --instance-name "$INSTANCE_NAME" --region "$REGION" --query 'instance.publicIpAddress' --output text)
log "Instance public IP: ${PUBLIC_IP}"

# ---- DNS (Route53) ----------------------------------------------------------
log "Upserting DNS record ${DOMAIN} -> ${PUBLIC_IP}"
CHANGE_BATCH=$(cat <<JSON
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "${DOMAIN}",
      "Type": "A",
      "TTL": 300,
      "ResourceRecords": [{"Value": "${PUBLIC_IP}"}]
    }
  }]
}
JSON
)
aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch "$CHANGE_BATCH" >/dev/null

# ---- Wait for SSH -------------------------------------------------------------
log "Waiting for SSH to be available..."
SSH_OPTS=(-i "$KEY_PAIR_FILE" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5)
until ssh "${SSH_OPTS[@]}" "${REMOTE_USER}@${PUBLIC_IP}" 'command -v docker && command -v aws' >/dev/null 2>&1; do
    sleep 5
done

# ---- Copy deploy files (compose + Caddyfile + env only — no source, no build context) --
log "Copying docker-compose.yml, Caddyfile, .env to instance"
ssh "${SSH_OPTS[@]}" "${REMOTE_USER}@${PUBLIC_IP}" "mkdir -p ${REMOTE_DIR}"
scp -i "$KEY_PAIR_FILE" -o StrictHostKeyChecking=accept-new \
    docker/docker-compose.yml docker/Caddyfile docker/.env \
    "${REMOTE_USER}@${PUBLIC_IP}:${REMOTE_DIR}/"

# ---- Configure remote AWS credentials (ECR pull-only user) -------------------
log "Configuring remote AWS credentials for ECR pull"
ssh "${SSH_OPTS[@]}" "${REMOTE_USER}@${PUBLIC_IP}" "mkdir -p ~/.aws && cat > ~/.aws/credentials && chmod 600 ~/.aws/credentials" <<EOF
[default]
aws_access_key_id = ${PULL_ACCESS_KEY_ID}
aws_secret_access_key = ${PULL_SECRET_ACCESS_KEY}
EOF
ssh "${SSH_OPTS[@]}" "${REMOTE_USER}@${PUBLIC_IP}" "printf '[default]\nregion = %s\n' '${REGION}' > ~/.aws/config"

# ---- Pull image + deploy ------------------------------------------------------
log "Logging in to ECR from the instance and deploying"
ssh "${SSH_OPTS[@]}" "${REMOTE_USER}@${PUBLIC_IP}" \
    "aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY} && \
     cd ${REMOTE_DIR} && docker compose --env-file .env pull && docker compose --env-file .env up -d"

log "Done. https://${DOMAIN} should be live once Caddy obtains its certificate (usually under a minute)."
