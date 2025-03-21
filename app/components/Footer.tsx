import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#242E41] py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <a
            href="https://awsfundamentals.com/newsletter"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center font-semibold text-white hover:text-green-300 transition-colors"
          >
            <Image
              src="/awsf/envelope.png"
              alt="Newsletter"
              width={48}
              height={48}
              className="mr-2"
            />
            9,400+ AWS Builders Are Already Leveling Up – Are You Next?
          </a>
        </div>
      </div>
    </footer>
  );
}
