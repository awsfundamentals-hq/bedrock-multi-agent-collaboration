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
      prepareAgent: true,
      foundationModel: FoundationModels.Amazon_Titan_Text_Express,
      instruction:
        'You are a Plot Creator specializing in creating structured story outlines. Given ' +
        'a genre and a premise, generate a well-structured plot, including:' +
        '• Introduction (setting, protagonist, initial conflict)' +
        '• Rising action (key events, character development, challenges)' +
        '• Climax (turning point or major confrontation)' +
        '• Resolution (how the story ends)' +
        'Ensure the plot is compelling and logically structured. Keep it within the given constraints, if any.' +
        'The plot has to be less than 200 words.',
    });

    const { alias: writerAlias } = createAgent({
      name: 'writer',
      agentResourceRoleArn: bedrockRole.arn,
      prepareAgent: true,
      foundationModel: FoundationModels.Amazon_Titan_Text_Express,
      instruction:
        'You are a Writing specializing in transforming structured plots into well-written stories. ' +
        'Given a structured outline, expand it into a narrative with detailed scenes, immersive descriptions, ' +
        'and natural dialogue. Maintain coherence and a consistent tone that fits the genre.' +
        'The story itself has to be less than 1000 words.',
    });

    const { alias: storyCreatorAlias, agent: storyCreator } = createAgent({
      name: 'story-creator',
      agentCollaboration: 'SUPERVISOR',
      agentResourceRoleArn: bedrockRole.arn,
      foundationModel: FoundationModels.Amazon_Titan_Text_Express,
      // set this to 'false' on the initial deployment, so that the collaborators can be added
      // before the agent is prepared
      prepareAgent: true,
      instruction:
        'You are a story creator. You need to create the story based on the provided genre and ' +
        'premise with the help of the writer and plot creator agents. You are responsible for ' +
        'providing the writer with the plot and the writer will write the story based on the plot.',
      collaborators: [
        {
          name: 'writer',
          instruction:
            'You need to invoke this agent to write the actual story. You need to provide a nicely structured plot ' +
            'to the agent so it can write the story based on the provided details.',
          aliasArn: writerAlias!.agentAliasArn,
        },
        {
          name: 'plot-creator',
          instruction:
            'You need to invoke this agent to create a structured plot outline. You need to provide ' +
            'a genre and a premise to the agent so it can create a plot.',
          aliasArn: plotCreatorAlias!.agentAliasArn,
        },
      ],
    });

    const storiesTable = new sst.aws.Dynamo('stories', {
      fields: {
        id: 'string',
      },
      primaryIndex: { hashKey: 'id' },
    });

    const storyCreatorFunction = new sst.aws.Function('story-creator', {
      handler: 'functions/story-creator.handler',
      url: true,
      timeout: '2 minutes',
      link: [storiesTable],
      environment: {
        AGENT_MODEL_ID: storyCreator.agentId,
        AGENT_ALIAS_ID: storyCreatorAlias?.agentAliasId!,
      },
      permissions: [
        {
          actions: ['bedrock:InvokeAgent'],
          resources: ['*'],
        },
      ],
    });

    const api = new sst.aws.Function('api', {
      handler: 'functions/api.handler',
      url: true,
      timeout: '1 minute',
      link: [storiesTable],
      environment: {
        STORY_CREATOR_FUNCTION_NAME: storyCreatorFunction.name,
      },
      permissions: [
        {
          actions: ['lambda:InvokeFunction'],
          resources: [storyCreatorFunction.arn],
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
