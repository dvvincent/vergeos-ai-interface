# VergeOS AI Interface - Project Summary

## What Is This?

The VergeOS AI Interface is a self-hosted, ChatGPT-like web application that connects to VergeOS's AI capabilities. It provides a beautiful, modern interface for interacting with AI models running on your own infrastructure.

## Why Was It Built?

### The Problem

- Cloud AI services (ChatGPT, Claude, etc.) require sending data to third parties
- API costs can add up quickly for heavy usage
- No control over model selection or infrastructure
- Dependency on external service availability

### The Solution

VergeOS now includes AI capabilities with an OpenAI-compatible API. This project provides:

- A polished web interface for those AI capabilities
- Complete data privacy (everything stays on your infrastructure)
- No per-request API costs
- Full control over which models to run

## Key Features

| Feature | Description |
|---------|-------------|
| **Streaming Responses** | Real-time, word-by-word output like ChatGPT |
| **Conversation History** | Saved locally in the browser |
| **Code Highlighting** | Automatic syntax highlighting for code blocks |
| **Mobile Responsive** | Works on phones and tablets |
| **Quick Actions** | Pre-configured prompts to get started |
| **Health Monitoring** | Built-in health check endpoint |

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Frontend (HTML/CSS/JS)                  │    │
│  │  - Modern gradient UI                               │    │
│  │  - Server-Sent Events for streaming                 │    │
│  │  - LocalStorage for history                         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Express.js Backend                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  - OpenAI SDK (compatible with VergeOS)             │    │
│  │  - Streaming proxy                                   │    │
│  │  - Health checks                                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      VergeOS Instance                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  - OpenAI-compatible API (/v1/chat/completions)     │    │
│  │  - Self-hosted AI models                            │    │
│  │  - GPU acceleration                                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Options

### 1. Local Development
Run directly with Node.js for testing and development.

### 2. Kubernetes (Recommended)
Deploy using ConfigMaps - no Docker build required. The deployment uses a base Node.js image and mounts code via ConfigMaps.

### 3. Docker
Build a custom image for traditional container deployments.

## Security Considerations

- **API Keys**: Stored in Kubernetes Secrets, never exposed to the frontend
- **TLS**: Supports self-signed certificates for internal VergeOS instances
- **Authentication**: Optional Cloudflare Access integration for zero-trust security
- **Network**: Can run entirely within a private network

## File Structure

```
vergeos-ai-interface/
├── server/
│   └── index.js          # Express backend (API proxy)
├── public/
│   ├── index.html        # Main UI structure
│   ├── style.css         # Styling (gradients, animations)
│   └── app.js            # Frontend logic (streaming, history)
├── k8s-deployment.yaml   # Complete Kubernetes manifests
├── deploy.sh             # Automated deployment script
├── .env.example          # Environment variable template
└── README.md             # Main documentation
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main web interface |
| `/api/health` | GET | Health check |
| `/api/chat` | POST | Non-streaming chat |
| `/api/chat/stream` | POST | Streaming chat (SSE) |
| `/api/models` | GET | List available models |

## Models Tested

- **SmolM3** - Compact, efficient model for general tasks
- **qwen3-coder-14B** - 14B parameter coding specialist

## Performance

- **Startup Time**: ~10-15 seconds (npm install + server start)
- **Memory Usage**: 256-512MB typical
- **Response Latency**: Depends on VergeOS AI model and hardware

## Future Enhancements

Potential improvements for future versions:

- [ ] Multiple conversation threads
- [ ] Model selection in UI
- [ ] File upload support
- [ ] System prompt customization
- [ ] Export conversations
- [ ] Dark/light theme toggle

## Contributing

Contributions are welcome! See the main README for guidelines.

## License

MIT License - see LICENSE file for details.
