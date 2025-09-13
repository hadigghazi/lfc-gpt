"use client";
import PromptSuggestionButton from "./PromptSuggestionButton";

const PromptSuggestionsRow = ({ onPromptClick }: { onPromptClick: (t: string) => void }) => {
  const prompts = [
    "Who is Liverpool's current head coach?",
    "Which Liverpool player died recently",
    "Who led Liverpool in goals and assists last season?",
    "When and where was Liverpool's last fixture, and what was the result?",
  ];

  return (
    <div className="prompt-suggestion-row">
      {prompts.map((prompt, i) => (
        <PromptSuggestionButton key={`suggestion-${i}`} text={prompt} onClick={onPromptClick} />
      ))}
    </div>
  );
};

export default PromptSuggestionsRow;
