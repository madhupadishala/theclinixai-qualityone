import Link from 'next/link';

export default function QualificationPage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">QualityOne / Qualification</p>
        <h1>Assessment & competency qualification</h1>
        <p className="lede">Training completion is only the foundation. Qualification requires knowledge evidence, practical performance and SME authorization.</p>
        <div className="status">Sprint 3 engine active</div>
      </section>
      <section className="grid" aria-label="Qualification capabilities">
        <article><h2>Knowledge</h2><p>Controlled assessments support single choice, multiple choice, true/false and scenario questions with retained attempts.</p></article>
        <article><h2>Practical / OJT</h2><p>Assessors record supervised samples, quality score, evidence reference and observations.</p></article>
        <article><h2>Thresholds</h2><p>Each curriculum can define knowledge score, practical score and minimum supervised sample requirements.</p></article>
        <article><h2>SME sign-off</h2><p>Final qualification can require an electronic signature after all competency evidence passes.</p></article>
        <article><h2>Qualification status</h2><p>Evidence is evaluated into NOT_STARTED, IN_PROGRESS, QUALIFIED, AT_RISK, EXPIRED or SUSPENDED.</p></article>
        <article><h2>Auditability</h2><p>Assessment, practical observation, evaluation and SME sign-off produce audit evidence.</p></article>
      </section>
      <p style={{ marginTop: 24 }}><Link href="/">← QualityOne home</Link></p>
    </main>
  );
}
