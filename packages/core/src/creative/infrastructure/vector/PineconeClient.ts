import { Pinecone } from '@pinecone-database/pinecone';
import { env } from '../../../shared/env';

/**
 * Pinecone Client Wrapper implementation for RAG (Retrieval-Augmented Generation).
 * Manages the connection to the vector database to store and retrieve dense script scene chunks.
 */
export class PineconeClientWrapper {
  private client: Pinecone | null = null;
  private readonly defaultIndex = "scenario-analysis-index";

  constructor() {
    if (env.PINECONE_API_KEY) {
      this.client = new Pinecone({ apiKey: env.PINECONE_API_KEY });
    } else {
      console.warn("⚠️ PINECONE_API_KEY is not set. Vector DB operations will fail.");
    }
  }

  /**
   * Upserts vectorized chunks of the screenplay into a specific namespace for RAG isolation.
   */
  async upsertVectors(scriptId: string, vectors: Array<{ id: string, values: number[], metadata: any }>): Promise<void> {
    if (!this.client) throw new Error("Pinecone Client is not initialized.");
    
    // Isolation pattern: We use the scriptId as the namespace to guarantee secure multi-tenancy.
    const index = this.client.index(this.defaultIndex).namespace(scriptId);
    await index.upsert(vectors);
  }

  /**
   * Searches the vector database for scenes semantically similar to the provided query vector.
   */
  async querySimilarScenes(scriptId: string, queryVector: number[], topK: number = 5): Promise<any[]> {
    if (!this.client) throw new Error("Pinecone Client is not initialized.");

    const index = this.client.index(this.defaultIndex).namespace(scriptId);
    const results = await index.query({
      topK,
      vector: queryVector,
      includeMetadata: true
    });

    return results.matches || [];
  }
}
