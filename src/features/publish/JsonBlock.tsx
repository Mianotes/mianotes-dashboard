export function JsonBlock({
  title,
  description,
  error,
  value,
  onChange
}: {
  title: string;
  description?: string;
  error?: string | null;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className={`json-block${error ? " has-error" : ""}`}>
      {error ? (
        <div className="json-block-error" role="alert">
          {error}
        </div>
      ) : null}
      <header>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <span>JSON</span>
      </header>
      <textarea
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}
