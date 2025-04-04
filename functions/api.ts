import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

const client = new BedrockAgentRuntimeClient({ region: 'us-east-1' });

const agentId = process.env.AGENT_MODEL_ID;
const agentAliasId = process.env.AGENT_ALIAS_ID;

export const handler = async (event: any) => {
  console.info(`Agent ID: ${agentId}`);
  console.info(`Agent Alias ID: ${agentAliasId}`);

  try {
    const body = JSON.parse(event.body);
    const prompt = body.prompt;

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' }),
      };
    }

    const command = new InvokeAgentCommand({
      agentId,
      agentAliasId,
      sessionId: Date.now().toString(),
      inputText: prompt,
    });

    const response = await client.send(command);
    let finalResponse = '';

    if (response.completion && typeof response.completion === 'object' && Symbol.asyncIterator in response.completion) {
      const stream = response.completion as AsyncIterable<any>;
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const lastChunk = chunks[chunks.length - 1];
      if (lastChunk.chunk && lastChunk.chunk.bytes) {
        const bytes = Object.values(lastChunk.chunk.bytes) as number[];
        finalResponse = String.fromCharCode(...bytes);
      }
    }

    console.info(`Answer received: ${finalResponse}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ answer: finalResponse }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
