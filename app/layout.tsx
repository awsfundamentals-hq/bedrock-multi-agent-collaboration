import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bedrock Multi-Agent System',
  description:
    'A sophisticated multi-agent system powered by AWS Bedrock, featuring specialized agents for task management, code generation, and system operations.',
  keywords: [
    'AWS Bedrock',
    'Multi-Agent System',
    'AI Agents',
    'Task Management',
    'Code Generation',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
