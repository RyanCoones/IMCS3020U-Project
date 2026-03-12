import { useAuth } from "react-oidc-context"

export default function Profile() {
    const auth = useAuth()
    const claims = auth.user?.profile as Record<string, string | undefined>;
    const username = claims?.["cognito:username"] || "User";

    return (
        <div className="flex flex-col gap-6 bg-ccgreen-700 rounded-md p-4 w-full max-w-4xl mx-auto">
            <h1>Welcome, {username}</h1>
            <p>Here, you'll be able to choose a model for inference, and customize your experience.</p>
        </div>
    );
}