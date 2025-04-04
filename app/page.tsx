'use client';

import { useRef } from 'react';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import PromptInput from './components/PromptInput';
import Stories, { StoriesRef } from './components/Stories';

export default function Home() {
  const storiesRef = useRef<StoriesRef>(null);

  const handleStoryCreated = () => {
    storiesRef.current?.fetchStories();
  };

  return (
    <div>
      <Navigation />
      <main className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PromptInput onStoryCreated={handleStoryCreated} />
          <div className="mt-8">
            <Stories ref={storiesRef} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
