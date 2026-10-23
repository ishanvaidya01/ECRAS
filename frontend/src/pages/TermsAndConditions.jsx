import React from 'react';

const TermsAndConditions = () => {
  return (
    <div className="glass-panel p-8 max-w-3xl mx-auto mt-8">
      <h1 className="text-3xl font-bold mb-6 text-slate-900">Terms and Conditions</h1>
      <p className="mb-4 text-sm text-slate-500">Effective Date: [TODO: Add Effective Date]</p>
      
      <div className="space-y-6 text-slate-700">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-slate-900">1. Acceptance of Terms</h2>
          <p>By accessing or using the ECRAS platform, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, do not use the platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-slate-900">2. Use of Platform</h2>
          <p>You agree to use the platform only for lawful purposes related to recruitment and employment. You must not:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Provide false or misleading information</li>
            <li>Attempt to manipulate the interview or ranking systems</li>
            <li>Interfere with or disrupt the platform's functionality</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-slate-900">3. Intellectual Property</h2>
          <p>The platform and its original content, features, and functionality are owned by [TODO: Add Company Name] and are protected by intellectual property laws. Users retain ownership of their submitted personal data.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3 text-slate-900">4. Limitation of Liability</h2>
          <p>[TODO: Add specific liability limitations and jurisdiction details for your organization].</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-slate-900">5. Contact Information</h2>
          <p>For questions about these Terms, please contact us at:</p>
          <p className="mt-2 font-medium">[TODO: Add Contact Email]</p>
        </section>
      </div>
    </div>
  );
};

export default TermsAndConditions;
