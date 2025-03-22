// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

enum FoundationModels {
  Claude3_Haiku = 'anthropic.claude-3-haiku-20240307-v1:0',
  Claude3_5Sonnet = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
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
    const bedrockRole = new aws.iam.Role('bedrock-role', {
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['sts:AssumeRole'],
            Principal: {
              Service: 'bedrock.amazonaws.com',
            },
          },
        ],
      }),
      inlinePolicies: [
        {
          name: 'bedrockPolicy',
          policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['bedrock:InvokeModel*', 'bedrock:CreateInferenceProfile'],
                Resource: [
                  'arn:aws:bedrock:*::foundation-model/*',
                  'arn:aws:bedrock:*:*:inference-profile/*',
                  'arn:aws:bedrock:*:*:application-inference-profile/*',
                ],
              },
              {
                Effect: 'Allow',
                Action: [
                  'bedrock:GetInferenceProfile',
                  'bedrock:ListInferenceProfiles',
                  'bedrock:DeleteInferenceProfile',
                  'bedrock:TagResource',
                  'bedrock:UntagResource',
                  'bedrock:ListTagsForResource',
                ],
                Resource: ['arn:aws:bedrock:*:*:inference-profile/*', 'arn:aws:bedrock:*:*:application-inference-profile/*'],
              },
            ],
          }),
        },
      ],
    });
    const engagementPredictor = new aws.bedrock.AgentAgent('engagement-predictor', {
      agentName: `${$app.stage}-engagement-predictor`,
      agentResourceRoleArn: bedrockRole.arn,
      idleSessionTtlInSeconds: 500,
      foundationModel: FoundationModels.Claude3_Haiku,
      instruction:
        'You are a social media analytics expert who predicts post performance and optimal timing. ' +
        'For each content idea, analyze potential reach and engagement based on content type, industry benchmarks, and audience behavior patterns. ' +
        'Your task is to estimate reach, engagement rate, and determine the best posting time (day/hour). ' +
        'Support each prediction with data-driven reasoning and industry-specific insights. ' +
        'Focus on actionable metrics that will maximize campaign impact.',
    });
    const engagementPredictorAlias = new aws.bedrock.AgentAgentAlias('engagement-predictor-alias', {
      agentAliasName: `${$app.stage}-engagement-predictor-alias`,
      agentId: engagementPredictor.agentId,
      description: 'Engagement Predictor',
    });

    const contentStrategist = new aws.bedrock.AgentAgent('content-strategist', {
      agentName: `${$app.stage}-content-strategist`,
      agentResourceRoleArn: bedrockRole.arn,
      idleSessionTtlInSeconds: 500,
      foundationModel: FoundationModels.Claude3_Haiku,
      instruction:
        'You are a social media content strategist with expertise in converting business goals into engaging social posts. ' +
        'Your task is to generate creative, on-brand content ideas that align with specified campaign goals and target audience. ' +
        'Each suggestion should include a topic, content type (image/video/text/poll), specific copy, and relevant hashtags. ' +
        'Focus on variety, authenticity, and ensuring each post serves a strategic purpose.',
    });
    const contentStrategistAlias = new aws.bedrock.AgentAgentAlias('content-strategist-alias', {
      agentAliasName: `${$app.stage}-content-strategist-alias`,
      agentId: contentStrategist.agentId,
      description: 'Content Strategist',
    });

    const socialMediaCampaignManager = new aws.bedrock.AgentAgent('social-media-campaign-manager', {
      agentCollaboration: 'SUPERVISOR',
      agentName: `${$app.stage}-social-media-campaign-manager`,
      agentResourceRoleArn: bedrockRole.arn,
      idleSessionTtlInSeconds: 500,
      foundationModel: FoundationModels.Claude3_Haiku,
      instruction: 'You are a strategic campaign manager who orchestrates social media campaigns from concept to execution.',
      prepareAgent: false,
    });

    const socialMediaCampaignManagerAlias = new aws.bedrock.AgentAgentAlias('social-media-campaign-manager-alias', {
      agentAliasName: `${$app.stage}-social-media-campaign-manager-alias`,
      agentId: socialMediaCampaignManager.agentId,
      description: 'Social Media Campaign Manager',
    });

    new aws.bedrock.AgentAgentCollaborator('content-strategist-collaborator', {
      agentId: socialMediaCampaignManager.agentId,
      collaborationInstruction:
        'You can invoke this agent for social media content strategy tasks ' +
        'such as converting business goals into engaging social posts. ' +
        'The agent generates creative, on-brand content ideas that align with specified campaign goals and target audience.',
      collaboratorName: 'content-strategist',
      relayConversationHistory: 'TO_COLLABORATOR',
      agentDescriptor: {
        aliasArn: contentStrategistAlias.agentAliasArn,
      },
    });

    new aws.bedrock.AgentAgentCollaborator('engagement-predictor-collaborator', {
      agentId: socialMediaCampaignManager.agentId,
      collaborationInstruction: 'You can invoke this agent for social media analytics to predict post performance and optimal timing.',
      collaboratorName: 'engagement-predictor',
      relayConversationHistory: 'TO_COLLABORATOR',
      agentDescriptor: {
        aliasArn: engagementPredictorAlias.agentAliasArn,
      },
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
