# Cloudflare Tunnel & Access Setup

This guide explains how to securely expose the VergeOS AI Interface using Cloudflare Tunnel and protect it with Cloudflare Access.

## Overview

Cloudflare Tunnel provides a secure way to expose your application without opening inbound ports on your firewall. Combined with Cloudflare Access, you get enterprise-grade authentication.

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Browser    │────▶│   Cloudflare    │────▶│  Your Cluster    │
│              │     │   (Edge/Access) │     │  (cloudflared)   │
└──────────────┘     └─────────────────┘     └──────────────────┘
                            │
                     ┌──────▼──────┐
                     │  Zero Trust │
                     │   Policy    │
                     └─────────────┘
```

## Prerequisites

- Cloudflare account (free tier works)
- Domain managed by Cloudflare DNS
- `cloudflared` installed in your cluster
- Kubernetes cluster with the VergeOS AI Interface deployed

## Part 1: Cloudflare Tunnel Setup

### Option A: Using cloudflared CLI

1. **Authenticate cloudflared**

```bash
cloudflared tunnel login
```

2. **Create a tunnel**

```bash
cloudflared tunnel create vergeos-ai
```

This creates a tunnel and outputs a tunnel ID. Save the credentials file.

3. **Configure the tunnel**

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /path/to/credentials.json

ingress:
  - hostname: ai.yourdomain.com
    service: http://vergeos-ai.vergeos-ai.svc.cluster.local:3001
  - service: http_status:404
```

4. **Create DNS record**

```bash
cloudflared tunnel route dns vergeos-ai ai.yourdomain.com
```

### Option B: Kubernetes Deployment

Deploy cloudflared as a Kubernetes deployment:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cloudflared-credentials
  namespace: cloudflare
type: Opaque
stringData:
  credentials.json: |
    {
      "AccountTag": "YOUR_ACCOUNT_TAG",
      "TunnelSecret": "YOUR_TUNNEL_SECRET",
      "TunnelID": "YOUR_TUNNEL_ID"
    }
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cloudflared-config
  namespace: cloudflare
data:
  config.yaml: |
    tunnel: YOUR_TUNNEL_ID
    credentials-file: /etc/cloudflared/credentials.json
    no-autoupdate: true
    ingress:
      - hostname: ai.yourdomain.com
        service: http://vergeos-ai.vergeos-ai.svc.cluster.local:3001
      - service: http_status:404
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloudflared
  namespace: cloudflare
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cloudflared
  template:
    metadata:
      labels:
        app: cloudflared
    spec:
      containers:
      - name: cloudflared
        image: cloudflare/cloudflared:latest
        args:
        - tunnel
        - --config
        - /etc/cloudflared/config.yaml
        - run
        volumeMounts:
        - name: config
          mountPath: /etc/cloudflared/config.yaml
          subPath: config.yaml
        - name: credentials
          mountPath: /etc/cloudflared/credentials.json
          subPath: credentials.json
      volumes:
      - name: config
        configMap:
          name: cloudflared-config
      - name: credentials
        secret:
          secretName: cloudflared-credentials
```

> ⚠️ **Security Note**: Replace placeholder values with your actual tunnel credentials. Never commit real credentials to version control.

## Part 2: Cloudflare Access Setup

### 1. Navigate to Zero Trust Dashboard

Go to: https://one.dash.cloudflare.com/

### 2. Create an Access Application

1. Go to **Access** → **Applications**
2. Click **Add an application**
3. Select **Self-hosted**

### 3. Configure Application

**Application Configuration:**
- **Application name**: VergeOS AI Interface
- **Session Duration**: 24 hours (or your preference)
- **Application domain**: `ai.yourdomain.com`

### 4. Create Access Policy

**Policy name**: Allowed Users

**Configure rules:**

| Rule Type | Selector | Value |
|-----------|----------|-------|
| Include | Emails | `user@example.com` |
| Include | Email Domain | `yourcompany.com` |

Example policy configurations:

**Email-based access:**
```
Include: Emails ending in @yourcompany.com
```

**Specific users:**
```
Include: Emails - user1@example.com, user2@example.com
```

**GitHub authentication:**
```
Include: GitHub Organization - your-org
```

### 5. Identity Providers

Configure authentication methods under **Settings** → **Authentication**:

- **One-time PIN** (email-based, no setup required)
- **Google** (requires OAuth app)
- **GitHub** (requires OAuth app)
- **Azure AD** (enterprise)
- **Okta** (enterprise)

## Using the Setup Script

The included `setup-cloudflare-tunnel.sh` script automates common tasks:

```bash
./setup-cloudflare-tunnel.sh
```

The script will prompt for:
- Tunnel name
- Hostname for the application
- Service URL

## Verification

### Test Tunnel Connection

```bash
cloudflared tunnel info vergeos-ai
```

### Test DNS Resolution

```bash
nslookup ai.yourdomain.com
```

Should return a Cloudflare IP address.

### Test Access

1. Open `https://ai.yourdomain.com` in a browser
2. You should see the Cloudflare Access login page
3. Authenticate with your configured method
4. Access granted → redirected to the application

## Troubleshooting

### Tunnel Not Connecting

```bash
# Check cloudflared logs
kubectl logs -n cloudflare -l app=cloudflared

# Verify tunnel status
cloudflared tunnel list
```

### DNS Not Resolving

- Wait 1-5 minutes for DNS propagation
- Verify CNAME record exists in Cloudflare DNS dashboard
- Check that the tunnel is running

### Access Denied

- Verify your email is in the Access policy
- Check that the policy is attached to the application
- Clear browser cookies and try again

### 502 Bad Gateway

- Service not reachable from cloudflared
- Check Kubernetes service name and namespace
- Verify the application is running

## Security Best Practices

1. **Use Access policies** - Don't expose the application without authentication
2. **Limit access** - Only allow specific users or domains
3. **Enable logging** - Monitor access attempts in the Zero Trust dashboard
4. **Regular audits** - Review who has access periodically
5. **Session duration** - Use shorter sessions for sensitive applications

## Additional Resources

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [Zero Trust Dashboard](https://one.dash.cloudflare.com/)
