"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useChat } from "ai/react";        // ai@3
import type { Message } from "ai";
import { useEffect, useRef, useState } from "react";

import f1GPTLogo from "./assets/f1GPTLogo.png"; // replace with LFC logo if you have one
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubble";

// ⬇️ render prompt row client-only to avoid extension-injected attrs breaking SSR
const PromptSuggestionsRow = dynamic(() => import("./components/PromptSuggestionsRow"), { ssr: false });

const Home = () => {
  const { input, handleInputChange, handleSubmit, append, isLoading, messages } = useChat();
  const noMessages = !messages || messages.length === 0;

  // auto-scroll
  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  // render the form only on client to dodge extension attribute injection during SSR
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handlePrompt = (promptText: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      content: promptText,
      role: "user",
    };
    append(msg);
  };

  return (
    <main>
      <Image src={f1GPTLogo} alt="LFC GPT Logo" width={250} />
      <section ref={chatRef} className={noMessages ? "" : "populated"}>
        {noMessages ? (
          <>
            <p className="starter-text">
              The Ultimate place for Liverpool FC supporters!
              <br />
              Ask LFC-GPT anything—fixtures, players, history, transfers and more.
              <br />
              We hope you enjoy!
            </p>
            <br />
            <PromptSuggestionsRow onPromptClick={handlePrompt} />
          </>
        ) : (
          <>
            {messages.map((message, index) => (
              <Bubble key={`message-${index}`} message={message} />
            ))}
            {isLoading && <LoadingBubble />}
          </>
        )}
      </section>

      {mounted && (
        <form onSubmit={handleSubmit}>
          <input
            className="question-box"
            onChange={handleInputChange}
            value={input}
            placeholder="Ask me something about Liverpool FC..."
          />
          <input type="submit" value="Send" />
        </form>
      )}
    </main>
  );
};

export default Home;
