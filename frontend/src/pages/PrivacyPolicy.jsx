import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="glass-panel p-8 max-w-3xl mx-auto mt-8">
      <h1 className="text-3xl font-bold mb-6 text-slate-900">Privacy Policy</h1>
      <p className="mb-4 text-sm text-slate-500">Effective Date: [TODO: Add Effective Date]</p>
      
      <div className="space-y-6 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-slate-900">1. Information We Collect</h2>
          <p>We collect information you provide directly to us, such as when you create an account, apply for a job, or participate in an interview. This includes:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Name and contact details</li>
            <li>Employment history and resume</li>
            <li>Interview transcripts and evaluation scores</li>
            <li>Demographic information (where provided for bias auditing)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-slate-900">2. How We Use Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Provide, maintain, and improve the ECRAS platform</li>
            <li>Process job applications and evaluate candidates</li>
            <li>Conduct bias audits to ensure compliance with hiring standards</li>
            <li>Communicate with you regarding your applications</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-slate-900">3. Data Sharing and Processing</h2>
          <p>We do not sell your personal data. We may share information with:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Organizations you explicitly apply to</li>
            <li>Third-party service providers acting on our behalf</li>
            <li>[TODO: List specific third-party services, e.g., AI providers, hosting services]</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-slate-900">4. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at:</p>
          <p className="mt-2 font-medium">[TODO: Add Contact Email]</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
