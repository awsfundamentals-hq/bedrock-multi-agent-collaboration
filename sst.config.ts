// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'bedrock-multi-agent',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
    };
  },
  async run() {
    new sst.aws.Nextjs('frontend');

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
                Action: [
                  'bedrock:InvokeModel*',
                  'bedrock:CreateInferenceProfile',
                ],
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
                Resource: [
                  'arn:aws:bedrock:*:*:inference-profile/*',
                  'arn:aws:bedrock:*:*:application-inference-profile/*',
                ],
              },
            ],
          }),
        },
      ],
    });
    const bedrockAgent = new aws.bedrock.AgentAgent('bedrock-agent', {
      agentName: 'test-agent-two',
      agentResourceRoleArn: bedrockRole.arn,
      idleSessionTtlInSeconds: 500,
      foundationModel: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
      instruction:
        'You are a helpful assistant specialized in AWS services. Your primary goal is to provide accurate, detailed information about AWS resources, best practices, and implementation strategies. You should always prioritize official AWS documentation when answering questions, and clearly indicate when you are uncertain about a specific detail. When users ask about code, provide complete, working examples with proper error handling and follow AWS security best practices.',
    });
  },
});
