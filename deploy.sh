#!/bin/bash

# Deploy VergeOS AI Interface to Kubernetes
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "VergeOS AI Interface - Kubernetes Deployment"
echo "=========================================="
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}✗${NC} kubectl not found. Please install kubectl first."
    exit 1
fi

echo -e "${BLUE}→${NC} Creating namespace..."
kubectl create namespace vergeos-ai --dry-run=client -o yaml | kubectl apply -f -

echo -e "${BLUE}→${NC} Generating public files ConfigMap..."
kubectl create configmap vergeos-ai-public \
    --from-file=public/ \
    --namespace=vergeos-ai \
    --dry-run=client -o yaml | kubectl apply -f -

echo -e "${BLUE}→${NC} Copying TLS secret from default namespace..."
kubectl get secret happynoises-wildcard-tls -n default -o yaml | \
    sed 's/namespace: default/namespace: vergeos-ai/' | \
    kubectl apply -f -

echo -e "${BLUE}→${NC} Applying Kubernetes manifests..."
kubectl apply -f k8s-deployment.yaml

echo -e "${BLUE}→${NC} Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=120s deployment/vergeos-ai -n vergeos-ai

echo ""
echo -e "${GREEN}✓${NC} Deployment complete!"
echo ""
echo "=========================================="
echo "Access Information"
echo "=========================================="
echo ""
echo "URL: https://vergeos-ai.happynoises.work"
echo ""
echo "To view logs:"
echo "  kubectl logs -f -n vergeos-ai -l app=vergeos-ai"
echo ""
echo "To check status:"
echo "  kubectl get pods -n vergeos-ai"
echo ""
echo "To delete:"
echo "  kubectl delete namespace vergeos-ai"
echo ""
