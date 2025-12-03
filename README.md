# VergeOS AI Interface

<div align="center">

![VergeOS AI](https://img.shields.io/badge/VergeOS-AI%20Powered-purple?style=for-the-badge)
![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-blue?style=for-the-badge&logo=kubernetes)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

A beautiful, ChatGPT-like web interface for interacting with AI models running on your VergeOS instance.

[Features](#-features) • [Quick Start](#-quick-start) • [Kubernetes](#️-kubernetes-deployment) • [Cloudflare](#-cloudflare-tunnel--access) • [Documentation](#-documentation)

</div>

---

## 📖 About

This project provides a modern web interface for VergeOS's new AI capabilities (available in the latest VergeOS release). It connects to the OpenAI-compatible API endpoint provided by VergeOS, allowing you to chat with self-hosted AI models through a beautiful, responsive interface.

> **Note**: VergeOS AI features are brand new! Check [docs.verge.io](https://docs.verge.io) for more information about VergeOS AI capabilities.

### Why This Project?

- 🏠 **Self-Hosted**: Keep your data private - everything runs in your infrastructure
- 💰 **Cost-Effective**: No API fees, use your own hardware
- 🎨 **Beautiful UI**: Modern gradient design with real-time streaming
- 🔐 **Secure**: Optional Cloudflare Access authentication
- ☸️ **Cloud Native**: Kubernetes-ready with ConfigMap deployment

## ✨ Features

### User Interface
- 🎨 **Modern Design** - Purple/blue gradient theme, mobile responsive
- ⚡ **Real-time Streaming** - Word-by-word responses like ChatGPT
- 💾 **Conversation History** - Automatically saved in browser localStorage
- 🔤 **Code Highlighting** - Automatic syntax highlighting for code blocks
- 🚀 **Quick Actions** - Pre-configured prompts to get started quickly
- 📱 **Mobile Friendly** - Fully responsive design

### Technical Features
- 🔌 **OpenAI SDK Compatible** - Uses standard OpenAI client library
- 🌊 **Server-Sent Events** - Efficient streaming with SSE
- 🔐 **SSL Support** - Works with self-signed certificates
- ☸️ **Kubernetes Native** - Deploy via ConfigMaps (no Docker build needed)
- 🔒 **Zero Trust Security** - Optional Cloudflare Tunnel + Access
- 📊 **Health Checks** - Kubernetes liveness and readiness probes

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- VergeOS instance with AI capabilities enabled
- VergeOS API key

### Local Development

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/vergeos-ai-interface.git
cd vergeos-ai-interface
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment**

```bash
cp .env.example .env
```

Edit `.env` with your VergeOS details:

```env
VERGEOS_BASE_URL=https://your-vergeos-instance.com/v1
VERGEOS_API_KEY=your-api-key-here
VERGEOS_MODEL=SmolM3
PORT=3001
NODE_TLS_REJECT_UNAUTHORIZED=0
```

4. **Start the server**

```bash
npm start
```

5. **Open your browser**

Navigate to: http://localhost:3001

## ☸️ Kubernetes Deployment

### Quick Deploy

```bash
# Deploy to Kubernetes
./deploy.sh
```

The deployment script will:
- Create the `vergeos-ai` namespace
- Generate ConfigMaps from your code
- Copy TLS secrets
- Deploy the application
- Wait for pods to be ready

### Manual Deployment

1. **Create ConfigMaps**

```bash
kubectl create configmap vergeos-ai-public \
    --from-file=public/ \
    --namespace=vergeos-ai
```

2. **Apply manifests**

```bash
kubectl apply -f k8s-deployment.yaml
```

3. **Check status**

```bash
kubectl get pods -n vergeos-ai
kubectl logs -f -n vergeos-ai -l app=vergeos-ai
```

### Configuration

The deployment uses Kubernetes Secrets for sensitive data:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: vergeos-ai-config
type: Opaque
stringData:
  VERGEOS_BASE_URL: "https://your-vergeos.com/v1"
  VERGEOS_API_KEY: "your-api-key"
  VERGEOS_MODEL: "SmolM3"
```

## 🔐 Cloudflare Tunnel & Access

### Setup Cloudflare Tunnel

Securely expose your application without opening ports:

```bash
./setup-cloudflare-tunnel.sh
```

This will:
- Add a route to your Cloudflare Tunnel
- Create a DNS record
- Set up Cloudflare Access authentication
- Configure email-based access policy

### Manual Setup

1. **Update tunnel configuration**

```yaml
ingress:
  - hostname: ai.yourdomain.com
    service: http://vergeos-ai.vergeos-ai.svc.cluster.local:3001
```

2. **Create DNS record**

```bash
# CNAME record
ai.yourdomain.com -> your-tunnel-id.cfargotunnel.com
```

3. **Configure Cloudflare Access**

See `CLOUDFLARE-TUNNEL-SETUP.md` for detailed instructions.

## 📁 Project Structure

```
vergeos-ai-interface/
├── server/
│   └── index.js              # Express backend server
├── public/
│   ├── index.html            # Main UI
│   ├── style.css             # Styling
│   └── app.js                # Frontend JavaScript
├── k8s-deployment.yaml       # Kubernetes manifests
├── deploy.sh                 # Deployment automation
├── setup-cloudflare-tunnel.sh # Cloudflare setup
├── package.json              # Node.js dependencies
├── .env.example              # Environment template
└── README.md                 # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `VERGEOS_BASE_URL` | VergeOS API endpoint | - |
| `VERGEOS_API_KEY` | Your VergeOS API key | - |
| `VERGEOS_MODEL` | AI model to use | `SmolM3` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Accept self-signed certs | `0` |

### Available Models

- **SmolM3** - Compact, efficient model for general tasks
- **qwen3-coder-14B** - 14B parameter model specialized for coding

## 🎨 Screenshots

### Chat Interface

![Chat Interface](docs/screenshots/chat-interface.png)

### Streaming Responses

![Streaming](docs/screenshots/streaming.png)

### Code Highlighting

![Code Highlighting](docs/screenshots/code-highlighting.png)

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3001/api/health
```

### View Logs

```bash
kubectl logs -f -n vergeos-ai -l app=vergeos-ai
```

### Resource Usage

```bash
kubectl top pod -n vergeos-ai
```

## 🐛 Troubleshooting

### Common Issues

**Cannot GET /**
- Ensure static files are being served from the correct path
- Check that ConfigMaps are mounted properly

**Connection Error**
- Verify `NODE_TLS_REJECT_UNAUTHORIZED=0` is set for self-signed certs
- Check that VergeOS endpoint is accessible
- Verify API key is correct

**DNS Not Resolving**
- Wait 1-5 minutes for DNS propagation
- Use `nslookup` to verify DNS records

See `KUBERNETES-DEPLOYMENT.md` for detailed troubleshooting.

## 📚 Documentation

- [Kubernetes Deployment Guide](KUBERNETES-DEPLOYMENT.md)
- [Cloudflare Tunnel Setup](CLOUDFLARE-TUNNEL-SETUP.md)
- [Project Summary](PROJECT-SUMMARY.md)
- [Blog Post](BLOG-POST.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **VergeOS** - For providing the AI infrastructure and OpenAI-compatible API
- **OpenAI** - For the excellent SDK that works seamlessly with VergeOS
- **Cloudflare** - For Tunnel and Access services
- **Kubernetes** - For the orchestration platform

## 🔗 Links

- [VergeOS Documentation](https://docs.verge.io)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

## 📧 Contact

Questions? Feel free to open an issue or reach out!

---

<div align="center">

**Built with ❤️ for the homelab community**

⭐ Star this repo if you find it useful!

</div>
