# Kubernetes Deployment Guide

This guide provides detailed instructions for deploying the VergeOS AI Interface to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (1.20+)
- `kubectl` configured with cluster access
- VergeOS instance with AI capabilities enabled
- VergeOS API key

## Architecture Overview

The deployment uses a ConfigMap-based approach, which means:
- No Docker image building required
- Code is mounted directly into a base Node.js container
- Easy updates by modifying ConfigMaps

```
┌─────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │                  vergeos-ai namespace              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │  │
│  │  │   Secret    │  │  ConfigMap  │  │ ConfigMap │  │  │
│  │  │   (config)  │  │  (server)   │  │ (public)  │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │  │
│  │         │                │               │        │  │
│  │         └────────────────┼───────────────┘        │  │
│  │                          ▼                        │  │
│  │                   ┌─────────────┐                 │  │
│  │                   │ Deployment  │                 │  │
│  │                   │ (node:18)   │                 │  │
│  │                   └──────┬──────┘                 │  │
│  │                          │                        │  │
│  │                   ┌──────▼──────┐                 │  │
│  │                   │   Service   │                 │  │
│  │                   │  (ClusterIP)│                 │  │
│  │                   └──────┬──────┘                 │  │
│  │                          │                        │  │
│  │                   ┌──────▼──────┐                 │  │
│  │                   │IngressRoute │                 │  │
│  │                   │  (Traefik)  │                 │  │
│  │                   └─────────────┘                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Deployment Steps

### 1. Create the Namespace

```bash
kubectl create namespace vergeos-ai
```

### 2. Configure Secrets

Edit `k8s-deployment.yaml` and update the Secret section with your values:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: vergeos-ai-config
  namespace: vergeos-ai
type: Opaque
stringData:
  VERGEOS_BASE_URL: "https://YOUR_VERGEOS_IP/v1"
  VERGEOS_API_KEY: "YOUR_API_KEY_HERE"
  VERGEOS_MODEL: "SmolM3"
  PORT: "3001"
  NODE_ENV: "production"
```

> ⚠️ **Security Note**: Never commit actual API keys to version control. Use environment-specific overlays or sealed secrets in production.

### 3. Create ConfigMaps for Code

```bash
# Create ConfigMap for public files
kubectl create configmap vergeos-ai-public \
    --from-file=public/ \
    --namespace=vergeos-ai

# The server ConfigMap is included in k8s-deployment.yaml
```

### 4. Apply the Deployment

```bash
kubectl apply -f k8s-deployment.yaml
```

### 5. Verify Deployment

```bash
# Check pod status
kubectl get pods -n vergeos-ai

# View logs
kubectl logs -f -n vergeos-ai -l app=vergeos-ai

# Check service
kubectl get svc -n vergeos-ai
```

## Using the Deploy Script

For convenience, use the included deployment script:

```bash
./deploy.sh
```

The script will:
1. Create the namespace if it doesn't exist
2. Create/update ConfigMaps from source files
3. Apply the Kubernetes manifests
4. Wait for pods to be ready
5. Display the deployment status

## Configuration Options

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VERGEOS_BASE_URL` | VergeOS API endpoint (e.g., `https://192.168.1.100/v1`) | Yes |
| `VERGEOS_API_KEY` | Your VergeOS API key | Yes |
| `VERGEOS_MODEL` | AI model to use (default: `SmolM3`) | No |
| `PORT` | Server port (default: `3001`) | No |
| `NODE_ENV` | Environment mode | No |

### Resource Limits

Default resource configuration:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

Adjust based on your cluster capacity and expected load.

## Updating the Application

### Update Code

1. Modify files in `public/` or `server/`
2. Recreate ConfigMaps:

```bash
kubectl delete configmap vergeos-ai-public -n vergeos-ai
kubectl create configmap vergeos-ai-public --from-file=public/ -n vergeos-ai
```

3. Restart the deployment:

```bash
kubectl rollout restart deployment/vergeos-ai -n vergeos-ai
```

### Update Configuration

1. Edit the Secret in `k8s-deployment.yaml`
2. Apply changes:

```bash
kubectl apply -f k8s-deployment.yaml
kubectl rollout restart deployment/vergeos-ai -n vergeos-ai
```

## Ingress Configuration

### Traefik (Default)

The deployment includes a Traefik IngressRoute. Update the hostname:

```yaml
spec:
  routes:
    - match: Host(`ai.yourdomain.com`)
```

### NGINX Ingress

If using NGINX Ingress Controller instead:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vergeos-ai
  namespace: vergeos-ai
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - ai.yourdomain.com
    secretName: your-tls-secret
  rules:
  - host: ai.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: vergeos-ai
            port:
              number: 3001
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod events
kubectl describe pod -n vergeos-ai -l app=vergeos-ai

# Check logs
kubectl logs -n vergeos-ai -l app=vergeos-ai --previous
```

### Common Issues

**"Cannot GET /"**
- ConfigMap not mounted correctly
- Check volume mounts in deployment

**Connection Refused**
- VergeOS endpoint not accessible from cluster
- Check network policies

**SSL Certificate Errors**
- `NODE_TLS_REJECT_UNAUTHORIZED=0` should be set for self-signed certs

**Health Check Failing**
- Increase `initialDelaySeconds` if npm install takes longer
- Check that port 3001 is correct

### Debug Mode

Run a debug pod:

```bash
kubectl run debug --rm -it --image=node:18-alpine -n vergeos-ai -- sh
```

## Scaling

The application is stateless and can be scaled:

```bash
kubectl scale deployment/vergeos-ai -n vergeos-ai --replicas=3
```

Note: Each replica will independently connect to VergeOS.

## Cleanup

Remove all resources:

```bash
kubectl delete namespace vergeos-ai
```

Or selectively:

```bash
kubectl delete -f k8s-deployment.yaml
kubectl delete configmap vergeos-ai-public -n vergeos-ai
```
