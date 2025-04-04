'use client';

import { useEffect, useState, useImperativeHandle, forwardRef } from 'react';

interface Story {
  id: string;
  prompt: string;
  story?: string;
}

export interface StoriesRef {
  fetchStories: () => Promise<void>;
}

const Stories = forwardRef<StoriesRef>((_, ref) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const LoadingSpinner = () => (
    <div className="flex items-center space-x-2">
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm text-gray-500">Generating...</span>
    </div>
  );

  const fetchStories = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL!, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }

      const data: { stories: Story[] } = await response.json();
      setStories(data.stories);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    fetchStories,
  }));

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStories();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete story');
      }

      setStories(stories.filter((story) => story.id !== id));
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading stories...</div>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prompt</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Story</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stories?.map((story) => (
              <tr key={story.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedStory(story)}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{truncateText(story.prompt, 50)}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{story.story ? truncateText(story.story, 100) : <LoadingSpinner />}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(story.id);
                    }}
                    className="text-red-600 hover:text-red-900 cursor-pointer"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedStory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium">Story Details</h3>
              <button onClick={() => setSelectedStory(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Prompt</h4>
                <p className="mt-1 text-gray-900">{selectedStory.prompt}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Story</h4>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{selectedStory.story || 'Generating...'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default Stories;
