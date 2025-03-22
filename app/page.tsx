import Navigation from './components/Navigation';
import Footer from './components/Footer';
import PromptInput from './components/PromptInput';

export default function Home() {
  return (
    <div>
      <Navigation />
      <main className="min-h-screen py-8">
        <PromptInput />
      </main>
      <Footer />
    </div>
  );
}
