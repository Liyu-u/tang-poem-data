type SectionHeadingProps = {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  question: string;
};

export function SectionHeading({ id, index, eyebrow, title, question }: SectionHeadingProps) {
  return (
    <header className="section-heading">
      <span className="section-heading__index">{index}</span>
      <div>
        <p className="section-heading__eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        <p className="section-heading__question">{question}</p>
      </div>
    </header>
  );
}
