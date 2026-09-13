import Link from 'next/link';
import { requirePermission } from '@/lib/authorization';
import { getCapaAging, getExecutiveDashboard, getQualificationHeatmap, getTrainingMatrix } from '@/lib/reporting';

export const dynamic = 'force-dynamic';

function pct(value: number) { return `${value.toFixed(1)}%`; }

export default async function EnterpriseDashboard() {
  const session = await requirePermission('reporting.read');
  const [dashboard, training, capas, qualifications] = await Promise.all([
    getExecutiveDashboard(session.tenantId),
    getTrainingMatrix(session.tenantId),
    getCapaAging(session.tenantId),
    getQualificationHeatmap(session.tenantId),
  ]);

  const topOverdue = capas.filter((c) => c.overdueDays > 0).slice(0, 6);
  const qualificationCounts = qualifications.reduce<Record<string, number>>((acc, q) => { acc[q.status] = (acc[q.status] ?? 0) + 1; return acc; }, {});

  return (
    <main className="shell enterprise-shell">
      <nav className="topnav"><Link href="/">QualityOne</Link><span>Enterprise Control Center</span><Link href="/qms">QMS</Link><Link href="/learning">Learning</Link><Link href="/pv">PV</Link></nav>
      <section className="dashboard-hero">
        <div><p className="eyebrow">TheClinixAI QualityOne</p><h1>Quality Control Center</h1><p className="lede">One inspection-ready view across documents, learning, QMS and PV qualification.</p></div>
        <div className="status">Generated {new Date(dashboard.generatedAt).toLocaleString('en-IN')}</div>
      </section>

      <section className="kpi-grid" aria-label="Executive quality indicators">
        <article className="kpi"><span>Training compliance</span><strong>{pct(dashboard.training.complianceRate)}</strong><small>{dashboard.training.overdue} overdue assignments</small></article>
        <article className="kpi"><span>Open deviations</span><strong>{dashboard.qms.openDeviations}</strong><small>{dashboard.qms.criticalOpen} critical open</small></article>
        <article className="kpi"><span>Open CAPAs</span><strong>{dashboard.qms.openCapas}</strong><small>{dashboard.qms.overdueCapas} overdue CAPAs</small></article>
        <article className="kpi"><span>Qualified workforce</span><strong>{dashboard.qualification.qualified}</strong><small>{dashboard.qualification.atRisk} at risk / expired / suspended</small></article>
        <article className="kpi"><span>Effective documents</span><strong>{dashboard.documents.effective}</strong><small>{dashboard.documents.inReview} currently in review</small></article>
        <article className="kpi"><span>Active users</span><strong>{dashboard.people.activeUsers}</strong><small>tenant-scoped workforce</small></article>
      </section>

      <section className="panel-grid">
        <article className="panel wide"><div className="panel-head"><div><p className="eyebrow">Learning</p><h2>Training Compliance Matrix</h2></div><Link href="/api/reporting/training">JSON report</Link></div>
          <div className="table-wrap"><table><thead><tr><th>Learner</th><th>Role</th><th>Department</th><th>Completed</th><th>Overdue</th><th>Compliance</th></tr></thead><tbody>{training.slice(0, 12).map((row) => <tr key={row.membershipId}><td>{row.learner}</td><td>{row.jobRole ?? '—'}</td><td>{row.department ?? '—'}</td><td>{row.completed}/{row.total}</td><td><span className={row.overdue ? 'badge danger' : 'badge'}>{row.overdue}</span></td><td><strong>{pct(row.complianceRate)}</strong></td></tr>)}</tbody></table></div>
        </article>

        <article className="panel"><div className="panel-head"><div><p className="eyebrow">QMS</p><h2>CAPA Aging</h2></div><Link href="/api/reporting/capas">Full report</Link></div>
          {topOverdue.length ? <div className="stack">{topOverdue.map((c) => <div className="list-row" key={c.id}><div><strong>{c.capaNumber}</strong><span>{c.title}</span></div><div className="right"><span className="badge danger">{c.overdueDays}d overdue</span><small>{c.owner}</small></div></div>)}</div> : <p className="muted">No overdue CAPAs.</p>}
        </article>

        <article className="panel"><div className="panel-head"><div><p className="eyebrow">Qualification</p><h2>Workforce Heatmap</h2></div><Link href="/api/reporting/qualifications">Full report</Link></div>
          <div className="heatmap">{['QUALIFIED','IN_PROGRESS','AT_RISK','EXPIRED','SUSPENDED'].map((status) => <div className="heat-cell" key={status}><strong>{qualificationCounts[status] ?? 0}</strong><span>{status.replaceAll('_',' ')}</span></div>)}</div>
        </article>
      </section>

      <section className="inspection-bar"><div><p className="eyebrow">Inspection readiness</p><h2>Evidence Pack</h2><p>Bounded tenant snapshot of audit events, signatures, training evidence, deviations and CAPAs.</p></div><a className="button" href="/api/reporting/inspection">Generate evidence snapshot</a></section>
    </main>
  );
}
