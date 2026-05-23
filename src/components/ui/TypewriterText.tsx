import { useEffect, useState } from "react";

export function TypewriterText({ text }: { text: string }) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    setVisibleText("");

    let index = 0;
    let timeoutId: number | undefined;

    function typeNextCharacter() {
      index += 1;
      setVisibleText(text.slice(0, index));
      if (index < text.length) {
        timeoutId = window.setTimeout(typeNextCharacter, 30);
      }
    }

    timeoutId = window.setTimeout(typeNextCharacter, 30);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [text]);

  return (
    <span className="typewriter-name" aria-label={text}>
      {visibleText}
      <span className="typewriter-cursor" aria-hidden="true" />
    </span>
  );
}
