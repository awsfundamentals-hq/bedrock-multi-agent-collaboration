import { DynamoDBClient, ScanCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { Resource } from 'sst';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });
const dynamoDB = new DynamoDBClient({ region: 'us-east-1' });
const storyCreatorFunctionName = process.env.STORY_CREATOR_FUNCTION_NAME;

export const handler = async (event: APIGatewayProxyEventV2) => {
  if (event.requestContext.http.method === 'GET') {
    const command = new ScanCommand({
      TableName: Resource.stories.name,
    });

    const result = await dynamoDB.send(command);
    const stories =
      result.Items?.map((item) => ({
        id: item.id.S,
        prompt: item.prompt.S,
        story: item.story?.S,
      })) || [];

    return {
      statusCode: 200,
      body: JSON.stringify({ stories }),
    };
  }

  if (event.requestContext.http.method === 'POST') {
    const body = JSON.parse(event.body ?? '{}');
    const prompt = body.prompt;

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' }),
      };
    }

    const command = new InvokeCommand({
      FunctionName: storyCreatorFunctionName,
      InvocationType: 'Event',
      Payload: JSON.stringify({ prompt }),
    });

    await lambdaClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Story creation started' }),
    };
  }

  if (event.requestContext.http.method === 'DELETE') {
    const storyId = event.queryStringParameters?.id;

    if (!storyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Story ID is required' }),
      };
    }

    const command = new DeleteItemCommand({
      TableName: Resource.stories.name,
      Key: {
        id: { S: storyId },
      },
    });

    await dynamoDB.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Story deleted successfully' }),
    };
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
