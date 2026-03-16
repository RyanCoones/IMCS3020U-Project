// AI generated with Claude — static privacy policy page, accessible logged in or out
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-950 flex items-start justify-center p-6 py-12">
      <div className="w-full max-w-2xl">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-300 transition text-sm mb-6 cursor-pointer"
        >
          <ArrowLeft size={15} /> Back
        </button>

        <div className="p-px rounded-2xl bg-linear-to-b from-blue-500/20 to-transparent">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-6">

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Shield size={20} className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-100">Privacy Policy</h1>
                <p className="text-neutral-500 text-xs mt-0.5">Last updated: March 2026</p>
              </div>
            </div>

            <div className="h-px bg-neutral-800" />

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Overview</h2>
              <p className="text-sm text-neutral-400 leading-relaxed">
                CrossCheck is a news credibility checking tool built for academic purposes (IMCS 3020U).
                We are committed to collecting only the minimum data necessary to provide the service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Data We Collect</h2>
              <div className="space-y-3">
                <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
                  <p className="text-sm font-medium text-neutral-200 mb-1">Email Address</p>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Your email address is collected when you create an account. It is stored securely
                    in <span className="text-neutral-300">AWS Cognito</span>, our authentication provider.
                    We use it only to identify your account — we do not send marketing emails.
                  </p>
                </div>
                <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
                  <p className="text-sm font-medium text-neutral-200 mb-1">Check History</p>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    When you submit a URL for a credibility check, the URL and the model's result
                    (label and probability score) are saved to your account history. This data is
                    stored in an <span className="text-neutral-300">AWS RDS PostgreSQL</span> database.
                    Article content is never stored — only the URL and result.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">How We Use Your Data</h2>
              <ul className="space-y-1.5 text-sm text-neutral-400">
                <li className="flex gap-2"><span className="text-blue-400 shrink-0">→</span> To authenticate you when you sign in</li>
                <li className="flex gap-2"><span className="text-blue-400 shrink-0">→</span> To display your check history in the Recents page</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Data Sharing</h2>
              <p className="text-sm text-neutral-400 leading-relaxed">
                We do not sell, trade, or share your personal data with any third parties.
                Your data is only stored in AWS infrastructure (Cognito and RDS) within the
                us-east-2 (Ohio) region.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Account Deletion</h2>
              <p className="text-sm text-neutral-400 leading-relaxed">
                You can delete your account at any time from the Profile page. Deleting your account
                permanently removes your email from AWS Cognito and all associated check history from
                our database.
              </p>
            </section>

            <div className="h-px bg-neutral-800" />

            <p className="text-xs text-neutral-600 text-center">
              CrossCheck · IMCS 3020U · Ontario Tech University
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}
