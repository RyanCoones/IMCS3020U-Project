// UI reworked with Claude AI — amber→blue avatar, preferences card, total checks stat, Danger Zone with account deletion
import { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { Settings, Trash2 } from "lucide-react";

export default function Profile() {
    const auth = useAuth();
    const claims = auth.user?.profile as Record<string, string | undefined>;
    const username = claims?.["cognito:username"] || "User";

    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [totalChecks, setTotalChecks] = useState<number | null>(null);

    useEffect(() => {
        const idToken = auth.user?.id_token;
        if (!idToken) return;
        fetch("/api/stats", { headers: { Authorization: `Bearer ${idToken}` } })
            .then(r => r.json())
            .then(d => setTotalChecks(d.total_checks))
            .catch(() => {});
    }, [auth.user?.id_token]);

    const handleDeleteAccount = async () => {
        setDeleting(true);
        setDeleteError(null);
        try {
            const idToken = auth.user?.id_token;
            const accessToken = auth.user?.access_token;

            const res = await fetch("/api/account", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
                },
                body: JSON.stringify({ access_token: accessToken }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || `Error ${res.status}`);
            }

            // clear local session and redirect to login
            await auth.removeUser();
            window.location.href = "/";
        } catch (err: unknown) {
            setDeleteError(err instanceof Error ? err.message : "Something went wrong.");
            setDeleting(false);
        }
    };

    return (
        <div className="flex flex-col gap-5 bg-neutral-900 border border-neutral-800 rounded-xl p-5 w-full max-w-4xl mx-auto shadow-lg shadow-black/30">
            <div>
                <h1 className="text-xl font-bold text-neutral-100">Profile</h1>
                <p className="text-neutral-400 text-sm mt-1">Manage your account and preferences.</p>
            </div>

            {/* User avatar card */}
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-6 flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-linear-to-b from-blue-600 to-blue-900 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-blue-500/30 shrink-0 select-none">
                    {username[0].toUpperCase()}
                </div>
                <div>
                    <p className="text-xl font-bold text-neutral-100">{username}</p>
                    <p className="text-neutral-500 text-sm mt-0.5">CrossCheck Member</p>
                    <p className="text-neutral-400 text-xs mt-1.5">
                        {totalChecks === null ? "Loading..." : <><span className="font-semibold text-blue-400">{totalChecks}</span> checks run</>}
                    </p>
                </div>
            </div>

            {/* Preferences card */}
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
                <div className="flex items-center gap-2 mb-3 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                    <Settings size={14} />
                    Preferences
                </div>
                <div className="flex items-center justify-between py-3 border-b border-neutral-700">
                    <div>
                        <p className="text-sm font-medium text-neutral-300">Inference Model</p>
                        <p className="text-xs text-neutral-600 mt-0.5">Choose which model to use for checks</p>
                    </div>
                    <span className="bg-blue-500/10 text-blue-400 text-xs rounded-full px-3 py-1 font-medium shrink-0">
                        Coming soon
                    </span>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-4">
                <div className="flex items-center gap-2 mb-3 text-red-400/70 text-xs font-semibold uppercase tracking-wider">
                    <Trash2 size={14} />
                    Danger Zone
                </div>

                {!confirming ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-neutral-300">Delete Account</p>
                            <p className="text-xs text-neutral-600 mt-0.5">Permanently removes your account and all check history</p>
                        </div>
                        <button
                            onClick={() => setConfirming(true)}
                            className="shrink-0 ml-4 px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors cursor-pointer"
                        >
                            Delete Account
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-neutral-300">
                            This is <span className="font-semibold text-red-400">permanent</span> and cannot be undone.
                            Your Cognito account and all check history will be deleted.
                        </p>
                        {deleteError && (
                            <p className="text-xs text-red-400">{deleteError}</p>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setConfirming(false); setDeleteError(null); }}
                                disabled={deleting}
                                className="flex-1 py-2 rounded-lg border border-neutral-700 text-neutral-400 hover:bg-neutral-800 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleting}
                                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deleting && (
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                )}
                                {deleting ? "Deleting..." : "Confirm Delete"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
