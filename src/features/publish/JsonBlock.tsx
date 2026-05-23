export function JsonBlock({
  title,
  description,
  value,
  onChange
}: {
  title: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="json-block">
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
