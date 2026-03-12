export default function Recents() {
    return (
        <div className="flex flex-col gap-6 bg-ccgreen-700 rounded-md p-4 w-full max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold">Recently Checked</h1>
            <p className="text-sm text-ccgreen-100">Your most recent checks will show up here.</p>
            <ul className="space-y-2">
                <li className="rounded-md bg-ccgreen-800 border border-green-500 p-3">Simcoe County students express ...</li>
                <li className="rounded-md bg-ccgreen-800 border border-red-500 p-3">Has the US ever assassinated ...</li>
                <li className="rounded-md bg-ccgreen-800 border border-yellow-300 p-3">Canada’s Carney under pressure ...</li>
            </ul>
        </div>
    )
}
