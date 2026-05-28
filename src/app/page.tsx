import ChatMessages from '@/components/ChatMessages';
import ChatInput from '@/components/ChatInput';

export default function Home() {
  return (
    <main className="h-dvh flex flex-col bg-gray-50">
      <header className="flex-none px-4 py-3 border-b border-gray-200 bg-white shadow-sm">
        <h1 className="text-lg font-semibold text-gray-800 text-center max-w-3xl mx-auto">
         Chat Assistant
        </h1>
      </header>
      <div className="flex-1 flex flex-col min-h-0 max-w-3xl w-full mx-auto px-4">
        <ChatMessages />
        <ChatInput />
      </div>
    </main>
  );
}
