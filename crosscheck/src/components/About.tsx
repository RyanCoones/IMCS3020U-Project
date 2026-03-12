export default function About() {
    return (
        <div className="flex flex-col gap-6 bg-ccgreen-700 rounded-md p-4 w-full max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold">About</h1>
            <p>CrossCheck helps you review content quickly with model-backed checks.</p>
            <div className="rounded-md bg-ccgreen-800 p-4 border border-ccgreen-600">
                <p>We can put information about each model, disclaimers, etc. here.</p>
            </div>
        </div>
    )
}
