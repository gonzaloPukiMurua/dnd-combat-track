import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-6">
      <h1 className="text-3xl font-bold">
        D&D Combat Tracker
      </h1>

      <p className="text-gray-500">
        Manage combat fast and clean.
      </p>

      <div className="flex gap-4">
        <Link
          href="/templates"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Templates
        </Link>

        <Link
          href="/combat"
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Combat
        </Link>
      </div>
    </div>
  );
}