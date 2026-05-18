"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createGroup, type GroupFormState } from "@/lib/actions/groups";
import Link from "next/link";

const INITIAL: GroupFormState = {};

export default function NewGroupPage() {
  const router = useRouter();
  const [state, action, isPending] = useActionState(createGroup, INITIAL);

  useEffect(() => {
    if (state.success) router.push("/groups");
  }, [state.success, router]);

  const inputCls = "w-full border-2 border-slate-200 rounded-xl px-3 h-12 text-base focus:outline-none focus:border-blue-500 transition-colors";

  return (
    <div className="py-6 space-y-6 max-w-lg">
      <div>
        <Link href="/groups" className="text-sm text-slate-400 hover:text-slate-600">
          ← Back to groups
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">New group</h1>
      </div>

      <form action={action} className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
        {state.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {state.error}
          </p>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600">Name</label>
          <input name="name" placeholder="The Dawnbreakers, Forest ambush…" required className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-600">Description (optional)</label>
          <input name="description" placeholder="Notes about this group…" className={inputCls} />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/groups"
            className="flex-1 h-12 flex items-center justify-center border-2 border-slate-200 rounded-xl text-slate-500 text-sm font-medium hover:bg-slate-50">
            Cancel
          </Link>
          <button type="submit" disabled={isPending}
            className="flex-1 h-12 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
            {isPending ? "Creating…" : "Create group"}
          </button>
        </div>
      </form>
    </div>
  );
}