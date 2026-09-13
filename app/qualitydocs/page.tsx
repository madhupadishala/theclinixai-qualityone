import Link from 'next/link';

export default function QualityDocsPage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">QualityOne / QualityDocs</p>
        <h1>Controlled documents</h1>
        <p className="lede">Draft → Review → Approval → Effective → Revision or Retirement.</p>
        <div className="status">Sprint 1 workflow active</div>
      </section>
      <section className="grid" aria-label="QualityDocs capabilities">
        <article><h2>Create</h2><p>SOPs, policies, work instructions, forms and templates start as controlled drafts.</p></article>
        <article><h2>Review</h2><p>Reviewers electronically sign the exact document version they reviewed.</p></article>
        <article><h2>Approve</h2><p>Approval requires completed review evidence and signs the immutable version hash.</p></article>
        <article><h2>Effective</h2><p>Only approved versions can become effective; effective dates remain in the version record.</p></article>
        <article><h2>Revise</h2><p>A revision retains the old version, creates the next controlled version and returns the document to Draft.</p></article>
        <article><h2>Audit</h2><p>Every lifecycle action creates traceable audit evidence.</p></article>
      </section>
      <p style={{ marginTop: 24 }}><Link href="/">← QualityOne home</Link></p>
    </main>
  );
}
