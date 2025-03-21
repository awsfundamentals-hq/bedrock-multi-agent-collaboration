import Image from 'next/image';

export default function Navigation() {
  return (
    <nav className="w-full flex items-center justify-between py-4 px-8 bg-[#242E41]">
      <Image src="/awsf/logo.png" alt="Logo" width={60} height={60} />
      <div id="title" className="flex items-center mx-auto">
        <Image
          src="/awsf/bedrock.png"
          alt="Bedrock Logo"
          width={60}
          height={60}
          className="mx-2 rounded-full shadow-md"
        />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Amazon Bedrock</h1>
          <p className="text-sm font-semibold text-gray-300">
            Build and Scale Generative AI Applications with{' '}
            <span className="text-[#FF9900] font-bold">Foundation Models</span>
          </p>
        </div>
      </div>
      <a
        href="https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1"
        target="_blank"
        rel="noopener noreferrer"
        className="bg-[#4B6AED] text-white px-4 py-2 rounded-md shadow-md flex items-center"
      >
        <Image
          src="/awsf/bookmark.svg"
          alt="Bookmark"
          width={20}
          height={20}
          className="mr-2"
        />
        Open Bedrock Console
      </a>
    </nav>
  );
}
