export default function PvCompetencyPage() {
  const competencies = [
    'Safety Intake',
    'Case Triage',
    'ICSR Case Processing',
    'MedDRA Coding',
    'Literature Screening',
    'Narrative Writing',
    'Case Follow-up',
    'Safety Submission',
    'Case Quality Control',
    'Medical Review',
    'Aggregate Reporting',
    'Signal Management',
  ];

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">TheClinixAI QualityOne</p>
        <h1>PV Competency Engine</h1>
        <p>Role, client and safety-database qualification built from controlled training, assessment, supervised case evidence and SME sign-off.</p>
      </section>
      <section className="grid">
        <article className="card">
          <h2>Qualification Profiles</h2>
          <p>Define minimum case counts, QC thresholds, critical competencies, client scope and database scope for each PV role.</p>
        </article>
        <article className="card">
          <h2>Supervised Evidence</h2>
          <p>Capture case-volume and quality evidence without storing patient or safety-case content in the qualification record.</p>
        </article>
        <article className="card">
          <h2>Controlled Status</h2>
          <p>Qualification progresses through IN_PROGRESS, QUALIFIED, AT_RISK and SUSPENDED based on current competency evidence.</p>
        </article>
      </section>
      <section className="card">
        <h2>PV competency library</h2>
        <ul>{competencies.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
    </main>
  );
}
