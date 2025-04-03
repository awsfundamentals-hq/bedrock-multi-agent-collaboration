// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./../.sst/platform/config.d.ts" />

export const createBedrockRole = (): aws.iam.Role => {
  const role = new aws.iam.Role('bedrock-role', {
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
  });
  new aws.iam.RolePolicyAttachment('bedrock-policy-attachment', {
    role: role.name,
    policyArn: 'arn:aws:iam::aws:policy/AmazonBedrockFullAccess',
  });
  return role;
};
