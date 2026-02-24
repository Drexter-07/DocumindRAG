import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { Send, Bot, User, Loader2, Database, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';

export const Chat = () => {
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  // Initial load: Fetch chat history list
  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const res = await api.get('/chats');
      setChats(res.data);
      if (res.data.length > 0 && !currentChatId) {
        // Automatically load the latest chat if none is selected
        loadChatMessages(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  const loadChatMessages = async (chatId) => {
    try {
      setCurrentChatId(chatId);
      const res = await api.get(`/chats/${chatId}/messages`);
      setMessages(res.data.messages);
    } catch (err) {
      console.error('Failed to load messages for chat:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const currentMsg = inputMessage.trim();
    setInputMessage('');
    
    // Add optimistic user message to UI
    const optimisticMsg = { id: Date.now(), role: 'user', content: currentMsg };
    setMessages((prev) => [...prev, optimisticMsg]);
    setIsLoading(true);

    try {
      const payload = { message: currentMsg };
      if (currentChatId) {
        payload.chat_id = currentChatId;
      }

      const res = await api.post('/chat', payload);
      
      // The backend returns the new chat ID, response text, and sources
      if (!currentChatId) {
        setCurrentChatId(res.data.chat_id);
        fetchChats(); // Refresh chat list to show new chat
      }

      const aiMsg = { 
        id: Date.now() + 1, 
        role: 'assistant', 
        content: res.data.response,
        sources: res.data.sources,
        source_summary: res.data.source_summary
      };
      
      setMessages((prev) => [...prev, aiMsg]);

    } catch (err) {
      console.error('Failed to send message:', err);
      // Optional: Handle error UI gracefully here
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
  };

  const handleDeleteChat = async (chatId) => {
    if (!window.confirm("Are you sure you want to delete this chat?")) return;
    
    try {
      await api.delete(`/chats/${chatId}`);
      
      const newChats = chats.filter(c => c.id !== chatId);
      setChats(newChats);
      
      // If the deleted chat was currently open
      if (currentChatId === chatId) {
        if (newChats.length > 0) {
          loadChatMessages(newChats[0].id);
        } else {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
      alert('Failed to delete chat session.');
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row p-4 gap-4">
      {/* Sidebar: Chat History List */}
      <div className="w-full md:w-64 flex flex-col gap-2">
        <button 
          onClick={handleNewChat}
          className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 font-medium py-2 rounded-lg transition-colors"
        >
          + New Chat
        </button>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-1 mt-2">
          {chats.map((chat) => (
            <div key={chat.id} className="relative group flex items-center">
              <button
                onClick={() => loadChatMessages(chat.id)}
                className={clsx(
                  "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors truncate border pr-10",
                  currentChatId === chat.id 
                    ? "bg-surface border-border text-text shadow-sm" 
                    : "bg-transparent border-transparent text-textMuted hover:bg-surfaceHover"
                )}
              >
                {chat.title}
              </button>
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleDeleteChat(chat.id); 
                }}
                className="absolute right-2 p-1.5 text-textMuted hover:text-red-400 hover:bg-red-400/10 rounded-md opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                title="Delete Chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 glass-panel rounded-2xl flex flex-col border border-border shadow-lg overflow-hidden relative">
        
        {/* Messages Layout */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-textMuted">
              <Bot className="w-12 h-12 mb-4 opacity-50 text-primary" />
              <p className="text-lg font-medium">How can I help you today?</p>
              <p className="text-sm mt-1">Ask questions based on your organization's documents.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={clsx(
                  "flex gap-4 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                {/* Avatar */}
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                  msg.role === 'user' 
                    ? "bg-primary/20 border-primary/30 text-primary" 
                    : "bg-surfaceHover border-border text-textMuted"
                )}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className="flex flex-col gap-1.5">
                  <div className={clsx(
                    "px-4 py-3 text-sm leading-relaxed rounded-2xl border flex flex-col gap-2 overflow-hidden break-words",
                    msg.role === 'user'
                      ? "bg-primary text-white border-primary rounded-tr-sm"
                      : "bg-surface border-border text-text rounded-tl-sm shadow-sm prose prose-sm prose-invert max-w-none"
                  )}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                  
                  {/* Sources Preview */}
                  {msg.role === 'assistant' && msg.source_summary && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-textMuted/70 bg-surfaceHover w-fit px-2 py-1 rounded-md border border-border">
                      <Database className="w-3 h-3" />
                      {msg.source_summary}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-4 max-w-[85%] mr-auto">
              <div className="w-8 h-8 rounded-full bg-surfaceHover border border-border flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-textMuted" />
              </div>
              <div className="px-5 py-3.5 bg-surface border border-border text-text rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Box */}
        <div className="p-4 bg-surface/50 border-t border-border backdrop-blur-md">
          <form 
            onSubmit={handleSendMessage}
            className="flex items-end gap-2 bg-background border border-border rounded-xl p-2 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all shadow-inner"
          >
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Ask a question about your documents..."
              className="flex-1 bg-transparent border-none text-text text-sm resize-none max-h-32 min-h-[44px] py-3 px-3 focus:outline-none placeholder:text-textMuted/50"
              rows={1}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-primary text-white rounded-lg hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center h-[44px] w-[44px]"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
            </button>
          </form>
          <div className="text-center mt-2 text-[10px] text-textMuted">
            AI can make mistakes. Verify information from the source documents.
          </div>
        </div>
      </div>
    </div>
  );
};
