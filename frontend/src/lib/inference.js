// Real AI Inference using WebLLM
// Runs actual LLM inference in the browser via WebGPU

import * as webllm from '@anthropic/webllm';

class InferenceEngine {
  constructor() {
    this.engine = null;
    this.modelId = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
    this.loading = false;
    this.ready = false;
    this.progress = 0;
    this.onProgress = null;
    this.onReady = null;
    this.onError = null;
  }

  // Check if WebGPU is available
  static async checkSupport() {
    if (!navigator.gpu) {
      return { supported: false, reason: 'WebGPU not available. Use Chrome/Edge 113+' };
    }
    
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return { supported: false, reason: 'No WebGPU adapter found' };
      }
      return { supported: true };
    } catch (e) {
      return { supported: false, reason: e.message };
    }
  }

  // Initialize the engine and load model
  async initialize(onProgress) {
    if (this.loading || this.ready) return;
    
    this.loading = true;
    this.onProgress = onProgress;

    try {
      // Check WebGPU support
      const support = await InferenceEngine.checkSupport();
      if (!support.supported) {
        throw new Error(support.reason);
      }

      // Create engine
      this.engine = await webllm.CreateMLCEngine(this.modelId, {
        initProgressCallback: (progress) => {
          this.progress = Math.round(progress.progress * 100);
          if (this.onProgress) {
            this.onProgress({
              stage: progress.text,
              progress: this.progress
            });
          }
        }
      });

      this.ready = true;
      this.loading = false;
      
      if (this.onReady) this.onReady();
      
      return true;
    } catch (error) {
      this.loading = false;
      if (this.onError) this.onError(error);
      throw error;
    }
  }

  // Run inference on a prompt
  async generate(prompt, options = {}) {
    if (!this.ready) {
      throw new Error('Engine not initialized');
    }

    const startTime = performance.now();
    
    try {
      const response = await this.engine.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant. Be concise.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || 256,
        temperature: options.temperature || 0.7,
        stream: false
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      return {
        success: true,
        response: response.choices[0].message.content,
        processingTime,
        tokensGenerated: response.usage?.completion_tokens || 0,
        model: this.modelId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        processingTime: performance.now() - startTime
      };
    }
  }

  // Get current status
  getStatus() {
    return {
      ready: this.ready,
      loading: this.loading,
      progress: this.progress,
      model: this.modelId
    };
  }

  // Cleanup
  async destroy() {
    if (this.engine) {
      // WebLLM cleanup if available
      this.engine = null;
      this.ready = false;
    }
  }
}

// Singleton instance
export const inferenceEngine = new InferenceEngine();
export default InferenceEngine;
