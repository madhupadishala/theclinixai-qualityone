import Link from 'next/link';

export default function LearningPage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">QualityOne / Learning</p>
        <h1>Controlled training</h1>
        <p className="lede">Role → Curriculum → Effective SOP Version → Assignment → Acknowledgement → Training Record.</p>
        <div className="status">Sprint 2 learning core active</div>
      </section>
      <section className="grid" aria-label="Learning capabilities">
        <article><h2>Curricula</h2><p>Build role-based curricula from effective, controlled document versions.</p></article>
        <article><h2>Assignments</h2><p>Assign by job role or named learner, with controlled due dates.</p></article>
        <article><h2>My Training</h2><p>Learners see assigned, in-progress, completed and overdue requirements.</p></article>
        <article><h2>Read & Understand</h2><p>Acknowledgement signs the exact SOP version hash and creates immutable training evidence.</p></article>
        <article><h2>Completion</h2><p>An assignment closes only after all required curriculum items have evidence.</p></article>
        <article><h2>Compliance</h2><p>Managers can review completion and overdue status across the tenant.</p></article>
      </section>
      <p style={{ marginTop: 24 }}><Link href="/qualitydocs">QualityDocs</Link> · <Link href="/">QualityOne home</Link></p>
    </main>
  );
}
