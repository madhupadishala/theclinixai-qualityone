import Link from 'next/link';

const modules = [
  { href: '/enterprise', title: 'Enterprise Control Center', body: 'Executive KPIs, training compliance, CAPA aging, qualification heatmap and inspection evidence.' },
  { href: '/qualitydocs', title: 'QualityDocs', body: 'Controlled SOP lifecycle, review, approval, versioning and effective-document management.' },
  { href: '/learning', title: 'Learning', body: 'Role-based curricula, retraining, assessment, OJT and completion evidence.' },
  { href: '/qualification', title: 'Qualification', body: 'Knowledge, practical evidence, SME sign-off and qualification status.' },
  { href: '/qms', title: 'QMS', body: 'Deviation, investigation, RCA, CAPA, effectiveness and controlled closure.' },
  { href: '/pv', title: 'PV Competency', body: 'PV-native competency profiles, supervised evidence and client/database qualification.' },
];

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">TheClinixAI</p>
        <h1>QualityOne</h1>
        <p className="lede">Integrated Quality Management, Learning and PV Qualification.</p>
        <div className="status">Sprint 8 enterprise UX active</div>
      </section>
      <section className="grid" aria-label="QualityOne modules">
        {modules.map((module) => <Link className="module-link" href={module.href} key={module.href}><article><h2>{module.title}</h2><p>{module.body}</p></article></Link>)}
      </section>
    </main>
  );
}
