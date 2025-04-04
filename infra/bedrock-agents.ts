// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./../.sst/platform/config.d.ts" />

export const createAgent = (params: {
  name: string;
  foundationModel: string;
  instruction: string;
  agentResourceRoleArn: $util.Output<string>;
  agentCollaboration?: 'SUPERVISOR' | 'COLLABORATOR';
  prepareAgent?: boolean;
  collaborators?: {
    name: string;
    instruction: string;
    aliasArn: $util.Output<string>;
  }[];
}): { agent: aws.bedrock.AgentAgent; alias?: aws.bedrock.AgentAgentAlias } => {
  const agent = new aws.bedrock.AgentAgent(params.name, {
    agentName: `${$app.stage}-${params.name}`,
    agentResourceRoleArn: params.agentResourceRoleArn,
    idleSessionTtlInSeconds: 500,
    foundationModel: params.foundationModel,
    instruction: params.instruction,
    agentCollaboration: params.agentCollaboration,
    prepareAgent: params.prepareAgent,
  });

  params.collaborators?.forEach((collaborator) => {
    new aws.bedrock.AgentAgentCollaborator(collaborator.name, {
      agentId: agent.agentId,
      collaborationInstruction: collaborator.instruction,
      collaboratorName: `${$app.stage}-${collaborator.name}`,
      relayConversationHistory: 'TO_COLLABORATOR',
      agentDescriptor: {
        aliasArn: collaborator.aliasArn,
      },
    });
  });

  let alias: aws.bedrock.AgentAgentAlias | undefined;

  if (params.prepareAgent) {
    alias = new aws.bedrock.AgentAgentAlias(params.name, {
      agentAliasName: `${$app.stage}-${params.name}-alias`,
      agentId: agent.agentId,
      description: params.name,
    });
  }

  return { agent, alias };
};
