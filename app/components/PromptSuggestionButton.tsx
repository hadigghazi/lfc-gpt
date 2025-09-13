"use client";

type Props = { text: string; onClick: (text: string) => void };

const PromptSuggestionButton = ({ text, onClick }: Props) => {
  return (
    <button
      type="button"
      className="prompt-suggestion-button"
      onClick={() => onClick(text)}
    >
      {text}
    </button>
  );
};

export default PromptSuggestionButton;
