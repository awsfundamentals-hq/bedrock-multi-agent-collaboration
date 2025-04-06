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

const foundationModel = FoundationModels.Claude3_Haiku;

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
      foundationModel,
      instruction:
        'You are a story creator responsible for producing a short story based on a given genre and premise. ' +
        'To do this, you must:\n' +
        '1. Invoke the "plot-creator" collaborator with the genre and premise to receive a structured plot.\n' +
        '2. Then invoke the "writer" collaborator with the structured plot to receive the final story.\n\n' +
        'You must not create the plot or the story yourself. Delegate all work to the collaborators.',
    });

    const { alias: writerAlias } = createAgent({
      name: 'writer',
      agentResourceRoleArn: bedrockRole.arn,
      prepareAgent: true,
      foundationModel,
      instruction:
        'You are a Plot Creator. When invoked, generate a structured story plot using the provided genre and premise. ' +
        'Respond only with the plot. Do not add commentary or generate the full story.',
    });

    const { alias: storyCreatorAlias, agent: storyCreator } = createAgent({
      name: 'story-creator',
      agentCollaboration: 'SUPERVISOR',
      agentResourceRoleArn: bedrockRole.arn,
      foundationModel,
      // set this to 'false' on the initial deployment, so that the collaborators can be added
      // before the agent is prepared
      prepareAgent: true,
      instruction:
        'You are a Writer. When invoked, transform the structured plot into a detailed story. ' +
        'Respond only with the story. Do not revise the plot or add unrelated content.',
      collaborators: [
        {
          name: 'writer',
          instruction: 'Invoke this agent with a structured plot. It will return a full story based on that outline.',
          aliasArn: writerAlias!.agentAliasArn,
        },
        {
          name: 'plot-creator',
          instruction:
            'Invoke this agent with a genre and premise to receive a structured plot. ' +
            'Use the result to inform the next step (story writing).',
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
