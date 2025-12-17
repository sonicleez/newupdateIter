import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { createCinematographyChat } from '../services/geminiService';
import { ChatMessage, GeneratedImage } from '../types';
import { Chat, Part } from '@google/genai';
import Spinner from './Spinner';

interface ChatBotProps {
  activeCreatorImage: GeneratedImage | null;
}

const ChatBot: React.FC<ChatBotProps> = ({ activeCreatorImage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [imageToSend, setImageToSend] = useState<GeneratedImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!chatRef.current) {
      chatRef.current = createCinematographyChat();
      setMessages([{ role: 'model', text: "Hello! I'm Cine-Bot, your cinematography assistant. How can I help you frame your next shot? Ask me about camera angles, posing, lighting, and more! You can also upload an image for analysis." }]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const processUploadedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file.');
        return;
    }
    
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        const [header, base64Data] = result.split(',');
        if (!header || !base64Data) { setError("Could not read the uploaded file."); return; }
        const mimeType = header.split(';')[0].split(':')[1];
        if (!mimeType) { setError("Could not determine the image type."); return; }
        setImageToSend({ base64: base64Data, mimeType });
    };
    reader.onerror = () => { setError("Failed to read the file."); };
    reader.readAsDataURL(file);
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
    event.target.value = ''; // Reset file input
  };

  const handleImportCurrentImage = () => {
    if (activeCreatorImage) {
      setImageToSend(activeCreatorImage);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedInput = userInput.trim();
    if ((!trimmedInput && !imageToSend) || isLoading || !chatRef.current) return;

    setError(null);
    setMessages(prev => [...prev, { role: 'user', text: trimmedInput, image: imageToSend ?? undefined }]);
    setUserInput('');
    setImageToSend(null);
    setIsLoading(true);

    try {
      const requestParts: Part[] = [];
      let textToSend = trimmedInput;

      // When an image is sent with no accompanying text, we provide a default prompt for analysis.
      // The Gemini API requires a text part in any multimodal message turn.
      if (imageToSend && !textToSend) {
        textToSend = "Analyze this image from a cinematography and photography perspective. Describe its style, lighting, camera angle, and composition. Provide a detailed prompt that could be used to generate a similar image.";
      }
      
      // The text part must be a Part object.
      if (textToSend) {
        requestParts.push({ text: textToSend });
      }

      // The image part is also a Part object.
      if (imageToSend) {
        requestParts.push({
          inlineData: {
            data: imageToSend.base64,
            mimeType: imageToSend.mimeType,
          }
        });
      }
      
      // For multimodal messages, the sendMessage method takes an array of Parts.
      const response = await chatRef.current.sendMessage(requestParts);
      setMessages(prev => [...prev, { role: 'model', text: response.text }]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Sorry, I encountered an error: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    // Extracts content from code blocks for cleaner copying
    const codeBlockRegex = /```(?:\w+\n)?([\s\S]+)```/;
    const match = text.match(codeBlockRegex);
    const contentToCopy = match ? match[1].trim() : text;

    navigator.clipboard.writeText(contentToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const Message: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isModel = message.role === 'model';
    const hasCodeBlock = message.text.includes('```');
    
    return (
      <div className={`flex ${isModel ? 'justify-start' : 'justify-end'}`}>
        <div className={`max-w-md lg:max-w-lg p-3 rounded-2xl ${isModel ? 'bg-black/20 text-white rounded-bl-none' : 'bg-blue-600/80 text-white rounded-br-none'}`}>
          {message.image && (
             <img 
               src={`data:${message.image.mimeType};base64,${message.image.base64}`} 
               alt="User upload" 
               className="rounded-lg mb-2 max-w-full h-auto"
             />
          )}
          {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
          {isModel && hasCodeBlock && (
            <button
              onClick={() => handleCopy(message.text)}
              className="mt-2 flex items-center gap-2 text-xs bg-black/30 hover:bg-black/50 text-white font-semibold py-1 px-2 rounded-md transition-colors"
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Copy Prompt
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`fixed bottom-0 right-0 m-6 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`}>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600/80 backdrop-blur-md text-white rounded-full p-4 shadow-lg hover:bg-blue-700/90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transform hover:scale-110 transition-transform"
          aria-label="Open Cine-Bot"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" /></svg>
        </button>
      </div>

      <div className={`fixed bottom-0 right-0 m-6 w-[calc(100%-3rem)] sm:w-96 h-[70vh] max-h-[600px] flex flex-col bg-black/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 transition-all duration-300 ease-in-out z-50 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <header className="flex items-center justify-between p-4 border-b border-white/20">
          <h3 className="font-bold text-lg text-blue-300">Cine-Bot Assistant</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-300 hover:text-white"
            aria-label="Close chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => <Message key={index} message={msg} />)}
          {isLoading && (
            <div className="flex justify-start">
               <div className="max-w-md lg:max-w-lg p-3 rounded-2xl bg-black/20 text-white rounded-bl-none flex items-center gap-2">
                  <Spinner className="h-5 w-5"/>
                  <span>Cine-Bot is thinking...</span>
               </div>
            </div>
          )}
           {error && <p className="text-red-400 text-sm px-2">{error}</p>}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-white/20">
           {imageToSend && (
            <div className="mb-2 p-2 bg-black/30 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={`data:${imageToSend.mimeType};base64,${imageToSend.base64}`} alt="Preview" className="w-10 h-10 rounded object-cover" />
                <span className="text-xs text-gray-300">Image attached</span>
              </div>
              <button onClick={() => setImageToSend(null)} className="p-1 rounded-full hover:bg-white/20" title="Remove image">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
           )}
          <form onSubmit={handleSendMessage} >
            <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1 border border-white/20 focus-within:ring-2 focus-within:ring-blue-500">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="text-gray-300 p-2 rounded-md hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Attach image from file"
                title="Attach image from file"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a3 3 0 10-6 0v4a3 3 0 106 0V7a1 1 0 10-2 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg>
              </button>
               <button 
                type="button"
                onClick={handleImportCurrentImage}
                disabled={isLoading || !activeCreatorImage}
                className="text-gray-300 p-2 rounded-md hover:bg-white/10 hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                aria-label="Analyze current image"
                title="Analyze current image from the creator"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </button>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask for prompt ideas..."
                className="flex-1 w-full bg-transparent p-2 text-white placeholder-gray-400 focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || (!userInput.trim() && !imageToSend)}
                className="bg-blue-600 text-white p-2 rounded-md disabled:bg-gray-600/50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                aria-label="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ChatBot;