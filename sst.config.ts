// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

import { createAgent } from './infra/bedrock-agents';
import { createBedrockRole } from './infra/bedrock-iam';

enum FoundationModels {
  Claude3_Haiku = 'anthropic.claude-3-haiku-20240307-v1:0',
  Claude3_5Sonnet = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
  Amazon_Nova_Lite = 'amazon.nova-lite-v1:0',
  Amazon_Nova_Micro = 'amazon.nova-micro-v1:0',
  Amazon_Titan_Text_Express = 'amazon.titan-text-express-v1',
  Amazon_Titan_Text_Lite = 'amazon.titan-text-lite-v1',
}

export default $config({
  app(input) {
    return {
      name: 'bedrock-multi-agent',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
      providers: {
        aws: {
          region: 'us-east-1',
          version: '6.73.0',
        },
      },
    };
  },
  async run() {
    const bedrockRole = createBedrockRole();

    const { alias: plotCreatorAlias } = createAgent({
      name: 'plot-creator',
      agentResourceRoleArn: bedrockRole.arn,
      foundationModel: FoundationModels.Claude3_Haiku,
      instruction:
        'You are a Plot Creator specializing in creating structured story outlines. Given ' +
        'a genre and a premise, generate a well-structured plot, including:' +
        '• Introduction (setting, protagonist, initial conflict)' +
        '• Rising action (key events, character development, challenges)' +
        '• Climax (turning point or major confrontation)' +
        '• Resolution (how the story ends)' +
        'Ensure the plot is compelling and logically structured. Keep it within the given constraints, if any.',
    });

    const { alias: writerAlias } = createAgent({
      name: 'writer',
      agentResourceRoleArn: bedrockRole.arn,
      foundationModel: FoundationModels.Claude3_Haiku,
      instruction:
        'You are a Writing specializing in transforming structured plots into well-written stories.' +
        ' Given a structured outline, expand it into a narrative with detailed scenes, immersive descriptions, ' +
        'and natural dialogue. Maintain coherence and a consistent tone that fits the genre.',
    });

    const { alias: storyCreatorAlias, agent: storyCreator } = createAgent({
      name: 'story-creator',
      agentCollaboration: 'SUPERVISOR',
      agentResourceRoleArn: bedrockRole.arn,
      foundationModel: FoundationModels.Claude3_Haiku,
      instruction:
        'You are the overseer of a story creation process, ensuring coherence, consistency, and quality. ' +
        'Your job is to define the story genre, structure, and tone.',
      collaborators: [
        {
          name: 'writer',
          instruction: 'You can invoke this agent to write a story.',
          aliasArn: writerAlias.agentAliasArn,
        },
        {
          name: 'plot-creator',
          instruction: 'You can invoke this agent to create a structured plot outline.',
          aliasArn: plotCreatorAlias.agentAliasArn,
        },
      ],
    });

    const api = new sst.aws.Function('api', {
      handler: 'functions/api.handler',
      url: true,
      timeout: '1 minute',
      environment: {
        AGENT_MODEL_ID: storyCreator.agentId,
        AGENT_ALIAS_ID: storyCreatorAlias.agentAliasId,
      },
      permissions: [
        {
          actions: ['bedrock:InvokeAgent'],
          resources: [storyCreatorAlias.agentAliasArn],
        },
      ],
    });

    new sst.aws.Nextjs('frontend', {
      environment: {
        NEXT_PUBLIC_API_URL: api.url,
      },
    });
  },
});
