const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Use absolute path for Kubernetes ConfigMap compatibility
const publicPath = '/app/public';
console.log('Serving static files from:', publicPath);
app.use(express.static(publicPath));

// Initialize OpenAI client with VergeOS endpoint
const client = new OpenAI({
    baseURL: process.env.VERGEOS_BASE_URL,
    apiKey: process.env.VERGEOS_API_KEY,
    // Disable SSL verification for local IP (if needed)
    httpAgent: new (require('https').Agent)({ rejectUnauthorized: false })
});

const DEFAULT_MODEL = process.env.VERGEOS_MODEL || 'Gemma-3';

// Cache for online models (refresh every 5 minutes)
let onlineModelsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        vergeosUrl: process.env.VERGEOS_BASE_URL,
        defaultModel: DEFAULT_MODEL
    });
});

// Chat endpoint - regular response
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model } = req.body;
        const selectedModel = model || DEFAULT_MODEL;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        console.log(`[${new Date().toISOString()}] Chat request with ${messages.length} messages using model: ${selectedModel}`);

        const response = await client.chat.completions.create({
            model: selectedModel,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000
        });

        console.log(`[${new Date().toISOString()}] Response received`);

        res.json({
            message: response.choices[0].message.content,
            usage: response.usage
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ 
            error: 'Failed to get response from VergeOS AI',
            details: error.message 
        });
    }
});

// Chat endpoint - streaming response
app.post('/api/chat/stream', async (req, res) => {
    try {
        const { messages, model } = req.body;
        const selectedModel = model || DEFAULT_MODEL;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        console.log(`[${new Date().toISOString()}] Streaming chat request with ${messages.length} messages using model: ${selectedModel}`);

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const requestStartTime = Date.now();
        let firstTokenTime = null;
        let streamStartTime = null;

        const stream = await client.chat.completions.create({
            model: selectedModel,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000,
            stream: true,
            stream_options: { include_usage: true }
        });

        streamStartTime = Date.now();

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                if (!firstTokenTime) {
                    firstTokenTime = Date.now();
                }
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
            
            // Check for usage data in final chunk
            if (chunk.usage) {
                const endTime = Date.now();
                const totalTime = (endTime - requestStartTime) / 1000;
                const ttft = firstTokenTime && streamStartTime ? ((firstTokenTime - streamStartTime) / 1000).toFixed(2) : null;
                
                // Calculate end-to-end tokens per second (total tokens / total time)
                const tokensPerSecond = totalTime > 0 ? (chunk.usage.completion_tokens / totalTime).toFixed(2) : 0;
                
                res.write(`data: ${JSON.stringify({ 
                    usage: {
                        prompt_tokens: chunk.usage.prompt_tokens,
                        completion_tokens: chunk.usage.completion_tokens,
                        total_tokens: chunk.usage.total_tokens,
                        tokens_per_second: parseFloat(tokensPerSecond),
                        total_time: totalTime.toFixed(2),
                        time_to_first_token: ttft ? parseFloat(ttft) : null
                    }
                })}\n\n`);
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// Get available models (with 15-second health check timeout per model)
app.get('/api/models', async (req, res) => {
    const MODEL_TEST_TIMEOUT = 15000; // 15 seconds
    const forceRefresh = req.query.refresh === 'true';
    const now = Date.now();
    
    // Return cached result if still valid and not empty
    if (!forceRefresh && onlineModelsCache && onlineModelsCache.length > 0 && (now - cacheTimestamp) < CACHE_TTL) {
        console.log(`[${new Date().toISOString()}] Returning cached models:`, onlineModelsCache.map(m => m.id));
        return res.json({ data: onlineModelsCache, object: 'list', cached: true });
    }
    
    try {
        const models = await client.models.list();
        const allModels = models.data || [];
        console.log(`[${new Date().toISOString()}] Testing ${allModels.length} models...`);
        
        // Test each model with a timeout
        const testPromises = allModels.map(async (model) => {
            try {
                // Race between the API call and a timeout
                const result = await Promise.race([
                    client.chat.completions.create({
                        model: model.id,
                        messages: [{ role: 'user', content: 'hi' }],
                        max_tokens: 1
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), MODEL_TEST_TIMEOUT)
                    )
                ]);
                return { model, online: true };
            } catch (err) {
                console.log(`[${new Date().toISOString()}] Model ${model.id}: OFFLINE (${err.message})`);
                return { model, online: false };
            }
        });
        
        const results = await Promise.all(testPromises);
        const onlineModels = results.filter(r => r.online).map(r => r.model);
        
        // If no models passed health check, return all models (better than empty)
        const modelsToReturn = onlineModels.length > 0 ? onlineModels : allModels;
        
        // Update cache only if we have results
        if (onlineModels.length > 0) {
            onlineModelsCache = onlineModels;
            cacheTimestamp = Date.now();
        }
        
        console.log(`[${new Date().toISOString()}] Online models: ${onlineModels.length}/${allModels.length}`, onlineModels.map(m => m.id));
        res.json({ data: modelsToReturn, object: 'list', tested: onlineModels.length > 0 });
    } catch (error) {
        console.error('Models error:', error);
        // Return default model if endpoint not available
        res.json({ 
            data: [{ id: DEFAULT_MODEL, object: 'model' }],
            fallback: true
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('===========================================');
    console.log('VergeOS AI Interface Server');
    console.log('===========================================');
    console.log(`Server running on: http://localhost:${PORT}`);
    console.log(`VergeOS endpoint: ${process.env.VERGEOS_BASE_URL}`);
    console.log(`Default Model: ${DEFAULT_MODEL}`);
    console.log('===========================================');
});
