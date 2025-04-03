# Bedrock Multi-Agent Collaboration Demo Application

This project demonstrates the use of Amazon Bedrock Multi-Agent Collaboration using SST (Serverless Stack) v3.

## Getting Started

To run this application, follow these steps:

1. Ensure you have Node.js installed on your system.
2. Clone this repository to your local machine.
3. Install the dependencies by running `pnpm i` in the project root directory.
4. Start the development server by running:

   ```
   npx sst dev
   ```

This command will deploy the application to your AWS account and start the local development environment.

## About the Project

This application is built using SST v3, which provides a powerful framework for building serverless applications.

It showcases how you can use Bedrock Multi-Agent Collaboration to orchestrate a social media campaign.

## Project Structure

- `sst.config.ts`: SST configuration file
- `app/page.tsx`: Main Next.js page for the frontend - it's a simple form that allows you to submit a prompt again the social media campaign manager
- `functions/api.ts`: An API Lambda function that talks to the social media campaign manager

## Learn More

To learn more about SST and how to use it for serverless development, check out the [SST documentation](https://docs.sst.dev/).
