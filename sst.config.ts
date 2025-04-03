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

    const { alias: engagementPredictorAlias } = createAgent({
      name: 'engagement-predictor',
      agentResourceRoleArn: bedrockRole.arn,
      foundationModel: FoundationModels.Claude3_Haiku,
      instruction:
        'You are a social media analytics expert who predicts post performance and optimal timing. ' +
        'For each content idea, analyze potential reach and engagement based on content type, industry benchmarks, and audience behavior patterns. ' +
        'Your task is to estimate reach, engagement rate, and determine the best posting time (day/hour). ' +
        'Support each prediction with data-driven reasoning and industry-specific insights. ' +
        'Focus on actionable metrics that will maximize campaign impact.',
    });

    const { alias: contentStrategistAlias } = createAgent({
      name: 'content-strategist',
      agentResourceRoleArn: bedrockRole.arn,
      foundationModel: FoundationModels.Claude3_Haiku,
      instruction:
        'You are a social media content strategist with expertise in converting business goals into engaging social posts. ' +
        'Your task is to generate creative, on-brand content ideas that align with specified campaign goals and target audience. ' +
        'Each suggestion should include a topic, content type (image/video/text/poll), specific copy, and relevant hashtags. ' +
        'Focus on variety, authenticity, and ensuring each post serves a strategic purpose.',
    });

    const { alias: socialMediaCampaignManagerAlias, agent: socialMediaCampaignManager } = createAgent({
      name: 'social-media-campaign-manager',
      agentCollaboration: 'SUPERVISOR',
      agentResourceRoleArn: bedrockRole.arn,
      foundationModel: FoundationModels.Claude3_Haiku,
      instruction: 'You are a strategic campaign manager who orchestrates social media campaigns from concept to execution.',
      collaborators: [
        {
          name: 'content-strategist',
          instruction:
            'You can invoke this agent for social media content strategy tasks ' +
            'such as converting business goals into engaging social posts. ' +
            'The agent generates creative, on-brand content ideas that align with specified campaign goals and target audience.',
          aliasArn: contentStrategistAlias.agentAliasArn,
        },
        {
          name: 'engagement-predictor',
          instruction: 'You can invoke this agent for social media analytics to predict post performance and optimal timing.',
          aliasArn: engagementPredictorAlias.agentAliasArn,
        },
      ],
    });

    const api = new sst.aws.Function('api', {
      handler: 'functions/api.handler',
      url: true,
      timeout: '1 minute',
      environment: {
        AGENT_MODEL_ID: socialMediaCampaignManager.agentId,
        AGENT_ALIAS_ID: socialMediaCampaignManagerAlias.agentAliasId,
      },
      permissions: [
        {
          actions: ['bedrock:InvokeAgent'],
          resources: [socialMediaCampaignManagerAlias.agentAliasArn],
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
